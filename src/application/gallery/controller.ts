import type { GalleryPayloadSource, GalleryRepository, ProjectRepository } from "../../domain/contracts";
import {
  createProjectFromGallery,
  validateGalleryPayload,
  type GalleryCopyDependencies,
  type GalleryCategory,
  type GalleryErrorCode,
  type GalleryListQuery,
  type GalleryPatternDetail,
  type GalleryPatternSummary,
  type GalleryResult,
} from "../../domain/gallery";
import type { PindouProjectV1 } from "../../domain/project";

export type GalleryListState =
  | { status: "idle" }
  | { status: "loading"; query: GalleryListQuery; items?: GalleryPatternSummary[]; nextCursor?: string }
  | { status: "ready"; query: GalleryListQuery; items: GalleryPatternSummary[]; nextCursor?: string }
  | { status: "empty"; query: GalleryListQuery }
  | {
    status: "failure";
    query: GalleryListQuery;
    error: { code: GalleryErrorCode };
    items?: GalleryPatternSummary[];
    nextCursor?: string;
  };

export type GalleryDetailState =
  | { status: "idle" }
  | { status: "loading"; id: string }
  | { status: "ready"; detail: GalleryPatternDetail }
  | { status: "not-found" }
  | { status: "failure"; id: string; error: { code: GalleryErrorCode } }
  | { status: "unsupported"; id: string };

export type GalleryCategoriesState =
  | { status: "idle" }
  | { status: "loading"; items: GalleryCategory[] }
  | { status: "ready"; items: GalleryCategory[] }
  | { status: "failure"; items: GalleryCategory[] };

export interface GalleryControllerState {
  list: GalleryListState;
  detail: GalleryDetailState;
  categories: GalleryCategoriesState;
}

export interface GalleryControllerDependencies {
  repository: GalleryRepository;
  payloadSource: GalleryPayloadSource;
  projects: ProjectRepository;
  copyDependencies: GalleryCopyDependencies;
}

export interface GalleryController {
  readonly state: GalleryControllerState;
  readonly list: GalleryListState;
  readonly detail: GalleryDetailState;
  readonly categories: GalleryCategoriesState;
  loadCategories(): Promise<void>;
  refresh(query: GalleryListQuery): Promise<void>;
  loadNextPage(): Promise<void>;
  retryList(): Promise<void>;
  loadDetail(id: string): Promise<void>;
  retryDetail(): Promise<void>;
  useCurrentDetail(): Promise<GalleryResult<PindouProjectV1>>;
}

export function createGalleryController(
  dependencies: GalleryControllerDependencies,
  state: GalleryControllerState = { list: { status: "idle" }, detail: { status: "idle" }, categories: { status: "idle" } },
): GalleryController {
  let listGeneration = 0;
  let detailGeneration = 0;
  let pendingUse: Promise<GalleryResult<PindouProjectV1>> | null = null;
  let retryListRequest: { query: GalleryListQuery; append: boolean; items: GalleryPatternSummary[]; nextCursor?: string } | null = null;
  let retryDetailId: string | null = null;

  async function requestList(
    query: GalleryListQuery,
    append = false,
    previousItems: GalleryPatternSummary[] = [],
    previousCursor?: string,
  ): Promise<void> {
    const generation = ++listGeneration;
    const requestQuery = cloneQuery(query);
    state.list = append
      ? { status: "loading", query: requestQuery, items: [...previousItems], nextCursor: previousCursor }
      : { status: "loading", query: requestQuery };
    const result = await dependencies.repository.listPatterns(requestQuery);
    if (generation !== listGeneration) return;

    if (!result.ok) {
      retryListRequest = { query: requestQuery, append, items: [...previousItems], nextCursor: previousCursor };
      state.list = append
        ? { status: "failure", query: requestQuery, error: result.error, items: [...previousItems], nextCursor: previousCursor }
        : { status: "failure", query: requestQuery, error: result.error };
      return;
    }

    retryListRequest = null;
    const items = append ? [...previousItems, ...result.data.items] : [...result.data.items];
    state.list = items.length === 0
      ? { status: "empty", query: requestQuery }
      : result.data.nextCursor === undefined
        ? { status: "ready", query: requestQuery, items }
        : { status: "ready", query: requestQuery, items, nextCursor: result.data.nextCursor };
  }

  async function refresh(query: GalleryListQuery): Promise<void> {
    await requestList(normalizeQuery(query));
  }

  async function loadCategories(): Promise<void> {
    const previous = state.categories.status === "ready" ? state.categories.items : [];
    state.categories = { status: "loading", items: [...previous] };
    const result = await dependencies.repository.listCategories();
    state.categories = result.ok
      ? { status: "ready", items: [...result.data] }
      : { status: "failure", items: [...previous] };
  }

  async function loadNextPage(): Promise<void> {
    if (state.list.status !== "ready" || !state.list.nextCursor) return;
    await requestList(
      { ...state.list.query, cursor: state.list.nextCursor },
      true,
      state.list.items,
      state.list.nextCursor,
    );
  }

  async function retryList(): Promise<void> {
    if (!retryListRequest) return;
    await requestList(
      retryListRequest.query,
      retryListRequest.append,
      retryListRequest.items,
      retryListRequest.nextCursor,
    );
  }

  async function loadDetail(id: string): Promise<void> {
    const generation = ++detailGeneration;
    retryDetailId = id;
    state.detail = { status: "loading", id };
    const result = await dependencies.repository.getPattern(id);
    if (generation !== detailGeneration) return;

    if (!result.ok) {
      state.detail = result.error.code === "UNSUPPORTED_VERSION"
        ? { status: "unsupported", id }
        : { status: "failure", id, error: result.error };
      return;
    }
    state.detail = result.data === null ? { status: "not-found" } : { status: "ready", detail: result.data };
  }

  async function retryDetail(): Promise<void> {
    if (retryDetailId) await loadDetail(retryDetailId);
  }

  function useCurrentDetail(): Promise<GalleryResult<PindouProjectV1>> {
    if (pendingUse) return pendingUse;
    if (state.detail.status !== "ready") return Promise.resolve(failure("INVALID_REQUEST"));

    const detail = state.detail.detail;
    const currentPromise: Promise<GalleryResult<PindouProjectV1>> = (async (): Promise<GalleryResult<PindouProjectV1>> => {
      const downloaded = await dependencies.payloadSource.download(detail.payload, { id: detail.id, version: detail.version });
      if (!downloaded.ok) return downloaded;
      try {
        const payload = validateGalleryPayload(JSON.parse(downloaded.data));
        if (!payload.ok) return failure(payload.error.code === "UNSUPPORTED_VERSION" ? "UNSUPPORTED_VERSION" : "PAYLOAD_INTEGRITY_FAILED");
        const project = createProjectFromGallery(detail, payload.value, dependencies.copyDependencies);
        if (!project.ok) return project;
        await dependencies.projects.save(project.data);
        return project;
      } catch {
        return failure("PAYLOAD_INTEGRITY_FAILED");
      }
    })();
    const tracked = currentPromise.finally(() => {
      if (pendingUse === tracked) pendingUse = null;
    });
    pendingUse = tracked;
    return tracked;
  }

  return {
    state,
    get list() { return state.list; },
    get detail() { return state.detail; },
    get categories() { return state.categories; },
    loadCategories,
    refresh,
    loadNextPage,
    retryList,
    loadDetail,
    retryDetail,
    useCurrentDetail,
  };
}

function normalizeQuery(query: GalleryListQuery): GalleryListQuery {
  const search = query.search?.trim();
  return search ? { ...query, search } : withoutSearch(query);
}

function withoutSearch(query: GalleryListQuery): GalleryListQuery {
  const result = { ...query };
  delete result.search;
  return result;
}

function cloneQuery(query: GalleryListQuery): GalleryListQuery {
  return {
    ...query,
    usageTags: query.usageTags ? [...query.usageTags] : undefined,
    themeTags: query.themeTags ? [...query.themeTags] : undefined,
    featureTags: query.featureTags ? [...query.featureTags] : undefined,
  };
}

function failure<T>(code: GalleryErrorCode): GalleryResult<T> {
  return { ok: false, error: { code } };
}
