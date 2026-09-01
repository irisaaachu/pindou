# DCloud uni-id vendoring record

Milestone 5 vendors only the official cloud deployment assets needed by Pindou. UI pages, demos, build output, sample users and account-bound configuration are excluded.

## Provenance

- Upstream: `https://gitcode.com/dcloud/hello_uni-id-pages.git`
- Branch resolved at import time: `dev`
- Exact commit: `d0b4b8ad6f837a62eaab2fd49f951e4d74926aa8`

All mappings below came from that single commit. Source files remain upstream-identical except for the target-layout manifest and schema overlays documented below:

| Official source | Repository destination |
| --- | --- |
| `uni_modules/uni-id-pages/uniCloud/cloudfunctions/uni-id-co` | `uniCloud-aliyun/cloudfunctions/uni-id-co` |
| `uni_modules/uni-id-common/uniCloud/cloudfunctions/common/uni-id-common` | `uniCloud-aliyun/cloudfunctions/common/uni-id-common` |
| `uni_modules/uni-config-center/uniCloud/cloudfunctions/common/uni-config-center` | `uniCloud-aliyun/cloudfunctions/common/uni-config-center` |
| `uni_modules/uni-open-bridge-common/uniCloud/cloudfunctions/common/uni-open-bridge-common` | `uniCloud-aliyun/cloudfunctions/common/uni-open-bridge-common` |
| `uni_modules/uni-captcha/uniCloud/cloudfunctions/common/uni-captcha` | `uniCloud-aliyun/cloudfunctions/common/uni-captcha` |
| `uni_modules/uni-cloud-s2s/uniCloud/cloudfunctions/common/uni-cloud-s2s` | `uniCloud-aliyun/cloudfunctions/common/uni-cloud-s2s` |
| contents of `uni_modules/uni-id-pages/uniCloud/database/` | `uniCloud-aliyun/database/` |

`uni-captcha` and `uni-cloud-s2s` are included because the pinned `uni-id-co` package declares them as `file:` common-module dependencies. They are the only scope expansion needed to close the current dependency graph; optional `extensions` were not copied.

## Target-layout overlays

Pindou relocates the deployable modules from their upstream `uni_modules` nesting into `uniCloud-aliyun`. Only these deployment metadata/security overlays differ from the pinned source:

- In `uni-id-co/package.json`, each `file:` dependency is rewritten to `file:../common/<name>` so it resolves from `uniCloud-aliyun/cloudfunctions/uni-id-co`.
- In the common-module manifests for `uni-id-common`, `uni-open-bridge-common`, `uni-captcha` and `uni-cloud-s2s`, the `uni-config-center` dependency is rewritten to `file:../uni-config-center`.
- `uni-config-center/package.json` has no `file:` dependency and therefore requires no value change; it is still one of the six reviewed target package manifests.
- In `uni-id-users.schema.json`, only `avatar`, `avatar_file` and `nickname` write permissions are restricted to privileged create/update permissions so clients cannot bypass `pindou-profile`.

All other copied source files remain identical to the pinned upstream commit.

## Dependency closure

The recursively discovered copied cloud package manifests declare only these `file:` common dependencies:

- `uni-id-co` → `uni-captcha`, `uni-cloud-s2s`, `uni-config-center`, `uni-id-common`, `uni-open-bridge-common`
- `uni-id-common`, `uni-open-bridge-common`, `uni-captcha`, `uni-cloud-s2s` → `uni-config-center`
- `uni-config-center` → none

Every rewritten `file:` value resolves from its target manifest directory to an existing package whose `name` matches the dependency key. No copied manifest declares a registry dependency, so no `npm install` is required.

## License evidence

The pinned upstream tree has no repository-root license and no separate license file in most copied roots. The only governing license file found inside a copied root is retained verbatim at:

- `uniCloud-aliyun/cloudfunctions/common/uni-captcha/LICENSE.md` — Apache License 2.0

Package metadata additionally declares:

- `uni-id-common`, `uni-config-center`, and `uni-captcha`: `Apache-2.0`
- `uni-open-bridge-common`: `ISC`
- `uni-id-co` and `uni-cloud-s2s`: no `license` field in the pinned package manifest

No license text or license designation was invented for packages where upstream did not provide one.

## Secret boundary

The deployable real configuration path `uniCloud-aliyun/cloudfunctions/common/uni-config-center/uni-id/config.json` is intentionally absent and ignored. It must be created locally from `uniCloud-aliyun/config/uni-id.config.example.json` only by the account owner; it must never be committed.
