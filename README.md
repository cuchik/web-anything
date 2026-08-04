# Bếp Từ Video

Bếp Từ Video nhận link Reel/video Facebook công khai, đọc ảnh đại diện của video và dùng Gemini Vision để tạo một công thức tiếng Việt có ghi rõ điều AI quan sát được và điều AI suy đoán.

> Ứng dụng hiện phân tích **ảnh đại diện**, không tải hay đọc toàn bộ video. Công thức, định lượng và calories là ước tính; người dùng phải kiểm tra dị ứng và an toàn thực phẩm.

## Stack

- Next.js 16 + React 19 chạy qua Vinext/Vite
- Cloudflare Workers và OpenAI Sites
- Gemini Vision
- Cloudflare D1 + Drizzle cho saved recipes, distributed rate limit và short-lived analysis cache
- pnpm, TypeScript strict, ESLint, Vitest và Node render tests

## Local setup

Yêu cầu Node.js `>=22.13.0` và pnpm version ghi trong `package.json`.

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Cấu hình `.env.local`:

```dotenv
GEMINI_API_KEY=your_server_side_key
GEMINI_MODEL=gemini-3.6-flash
USER_ID_PEPPER=a_long_random_server_secret
```

Không commit `.env.local`. Nếu chỉ test giao diện, app có thể chạy không cần D1; analyze cần Gemini key và lưu recipe cần Sites authentication + D1.

## Commands

```bash
pnpm dev          # local development
pnpm lint         # ESLint, zero warnings
pnpm typecheck    # strict TypeScript
pnpm test         # unit + server-render tests
pnpm build        # production Worker build
pnpm verify       # all required quality gates
pnpm audit        # dependency vulnerabilities
pnpm db:generate  # generate D1 migrations after schema changes
pnpm eval:offline # AI contract and prompt regression tests
```

## Architecture

```text
Browser
  -> POST /api/analyze
  -> URL validation + D1 rate limit/cache
  -> safe Facebook metadata fetch
  -> bounded Facebook CDN image fetch
  -> Gemini structured output
  -> runtime schema validation
  -> observations / assumptions / warnings

Signed-in user
  -> /api/recipes
  -> server-side ownership check
  -> D1 saved recipes
```

Xem [architecture](docs/architecture.md), [API](docs/api/analyze.md), [AI contract](docs/ai/prompt-and-output-schema.md), [security](docs/security-threat-model.md) và [deployment](docs/deployment.md).

## Product limitations

- Facebook có thể chặn metadata của video private, login-gated hoặc region-limited.
- Không có fallback ảnh giả cho request thật; app trả lỗi rõ ràng nếu không lấy được ảnh.
- Numeric confidence không phải xác suất đã calibration; UI chỉ dùng confidence band.
- Video/frame extraction thật nằm ngoài MVP hiện tại và cần Meta/platform compliance review.

## Contributing and security

Đọc [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md) và [AGENTS.md](AGENTS.md) trước khi thay đổi code.

Repo chưa có license công khai. Cho đến khi chủ sở hữu chọn license, hãy xem source là private và không tái phân phối.
