# Bếp Từ Video

Bếp Từ Video nhận link Reel/video Facebook công khai, dùng Gemini đọc nhiều khung hình xuyên suốt video và tạo một công thức tiếng Việt có ghi rõ điều AI quan sát được và điều AI suy đoán.

> Khi Facebook không cung cấp direct video URL an toàn, ứng dụng fallback về **ảnh đại diện** và ghi rõ chế độ này trong kết quả. Công thức, định lượng và calories vẫn là ước tính; người dùng phải kiểm tra dị ứng và an toàn thực phẩm.

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
  -> safe Facebook metadata + embedded progressive-video extraction
  -> validated Facebook CDN video or thumbnail fetch
  -> Gemini inline video / Files API / image analysis
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
- Không có fallback ảnh giả cho request thật; thumbnail fallback luôn là ảnh thật của chính video.
- Video dưới giới hạn inline được gửi trực tiếp; video lớn hơn được stream tạm thời qua Gemini Files API và xóa sau khi phân tích.
- Facebook direct video fields là API không chính thức và có thể thay đổi; khi không tìm được hoặc tải video thất bại, app phân tích thumbnail và hiển thị rõ giới hạn này.
- Numeric confidence không phải xác suất đã calibration; UI chỉ dùng confidence band.

## Contributing and security

Đọc [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md) và [AGENTS.md](AGENTS.md) trước khi thay đổi code.

Dự án được phát hành theo [MIT License](LICENSE).
