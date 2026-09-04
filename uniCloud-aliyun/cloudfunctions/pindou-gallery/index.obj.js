"use strict";

const { success } = require("pindou-cloud-common");
const {
  buildCategoryQuery,
  buildPatternQuery,
  encodeCursor,
  projectCategory,
  projectPatternSummary,
  projectPatternDetail,
} = require("./gallery-core");

function publicError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function publicFailure(error) {
  const code = error && (error.code === "INVALID_REQUEST" || error.code === "ASSET_UNAVAILABLE")
    ? error.code
    : "INTERNAL_ERROR";
  return { ok: false, error: { code } };
}

function cloudCollections() {
  const db = uniCloud.database();
  return {
    db,
    categories: db.collection("pindou-gallery-categories"),
    patterns: db.collection("pindou-gallery-patterns"),
  };
}

module.exports = {
  async listCategories() {
    try {
      const { db, categories } = cloudCollections();
      const result = await categories
        .where(toDatabaseSelector(buildCategoryQuery(), db))
        .orderBy("order", "asc")
        .orderBy("content_id", "asc")
        .get();
      const data = [];
      for (const record of result.data || []) {
        const category = projectCategory(record);
        if (!category) continue;
        data.push(await resolveCategoryAssets(category));
      }
      return success(data);
    } catch (error) {
      return publicFailure(error);
    }
  },

  async listPatterns(query) {
    try {
      const request = buildPatternQuery(query);
      const { db, patterns } = cloudCollections();
      const { orderBy, limit, cursor, ...selector } = request;
      let databaseQuery = patterns.where(toDatabaseSelector(selector, db));
      for (const [field, direction] of orderBy) databaseQuery = databaseQuery.orderBy(field, direction);
      const result = await databaseQuery.limit(limit + 1).get();
      const records = (result.data || []).slice(0, limit);
      const items = [];
      for (const record of records) {
        const summary = projectPatternSummary(record);
        if (!summary) continue;
        items.push(await resolveSummaryAssets(summary));
      }
      const page = { items };
      if ((result.data || []).length > limit && records.length === limit) {
        page.nextCursor = encodeCursor(request.orderBy[0][0] === "recommendation_weight" ? "featured" : "newest", sortTuple(records[records.length - 1], request.orderBy));
      }
      return success(page);
    } catch (error) {
      return publicFailure(error);
    }
  },

  async getPattern(contentId) {
    try {
      if (typeof contentId !== "string" || !contentId.trim() || contentId !== contentId.trim()) {
        throw publicError("INVALID_REQUEST");
      }
      const request = buildPatternQuery({});
      const { orderBy, limit, cursor, ...selector } = request;
      selector.content_id = contentId;
      const { db, patterns } = cloudCollections();
      const result = await patterns.where(toDatabaseSelector(selector, db)).limit(1).get();
      const detail = projectPatternDetail(result.data && result.data[0]);
      if (!detail) return success(null);
      return success(await resolveDetailAssets(detail));
    } catch (error) {
      return publicFailure(error);
    }
  },
};

async function resolveCategoryAssets(category) {
  if (!category.coverRef) return category;
  const urls = await resolveTempUrls([category.coverRef]);
  return { ...category, coverRef: urls[category.coverRef] };
}

async function resolveSummaryAssets(summary) {
  const urls = await resolveTempUrls([summary.coverRef]);
  return { ...summary, coverRef: urls[summary.coverRef] };
}

async function resolveDetailAssets(detail) {
  const urls = await resolveTempUrls([detail.coverRef, detail.previewRef, detail.payload.fileRef]);
  return {
    ...detail,
    coverRef: urls[detail.coverRef],
    previewRef: urls[detail.previewRef],
    payload: { ...detail.payload, fileRef: urls[detail.payload.fileRef] },
  };
}

async function resolveTempUrls(fileList) {
  if (fileList.some((file) => typeof file !== "string" || !file)) throw publicError("ASSET_UNAVAILABLE");
  let response;
  try {
    response = await uniCloud.getTempFileURL({ fileList });
  } catch {
    throw publicError("ASSET_UNAVAILABLE");
  }
  const urls = {};
  for (const file of response && response.fileList || []) {
    if (file && typeof file.fileID === "string" && typeof file.tempFileURL === "string" && file.tempFileURL) {
      urls[file.fileID] = file.tempFileURL;
    }
  }
  if (fileList.some((file) => !urls[file])) throw publicError("ASSET_UNAVAILABLE");
  return urls;
}

function sortTuple(record, orderBy) {
  return orderBy.map(([field]) => record[field]);
}

function toDatabaseSelector(selector, db) {
  const base = {};
  const clauses = [];
  for (const [field, value] of Object.entries(selector)) {
    if (field === "$and") {
      clauses.push(...value.map((clause) => toDatabaseSelector(clause, db)));
      continue;
    }
    if (field === "$or") {
      clauses.push(db.command.or(value.map((clause) => toDatabaseSelector(clause, db))));
      continue;
    }
    base[field] = toDatabaseValue(value, db);
  }
  return clauses.length ? db.command.and([base, ...clauses]) : base;
}

function toDatabaseValue(value, db) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  if (Array.isArray(value.$in)) return db.command.in(value.$in);
  if (Object.prototype.hasOwnProperty.call(value, "$lt")) return db.command.lt(value.$lt);
  if (Object.prototype.hasOwnProperty.call(value, "$gt")) return db.command.gt(value.$gt);
  if (typeof value.$regex === "string") return new db.RegExp({ regexp: value.$regex, options: value.$options || "" });
  return value;
}
