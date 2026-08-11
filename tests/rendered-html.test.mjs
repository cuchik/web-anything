import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Bếp Từ Video product page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="vi">/);
  assert.match(html, /<title>Bếp Từ Video/);
  assert.match(html, /Dán link Reel hoặc video/);
  assert.match(html, /Lấy công thức/);
  assert.match(html, /Một video\. Một công thức hoàn chỉnh\./);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site|vinext-starter/i);
});

test("server-renders the first-party sign-in page", async () => {
  const response = await render("/signin?return_to=%2F");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Tên đăng nhập/);
  assert.match(html, /Mật khẩu/);
  assert.match(html, /Quên mật khẩu/);
  assert.doesNotMatch(html, /signin-with-chatgpt/);
});

test("sign-up page asks only for a username and password", async () => {
  const response = await render("/signup");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Tạo tài khoản/);
  assert.match(html, /Tên đăng nhập/);
  // No email field and no confirm-password field.
  assert.doesNotMatch(html, /type="email"/);
  assert.doesNotMatch(html, /Nhập lại mật khẩu/);
});

test("sign-up page lists every password rule", async () => {
  const response = await render("/signup");
  const html = await response.text();

  assert.match(html, /Từ 8 ký tự trở lên/);
  assert.match(html, /Có chữ thường/);
  assert.match(html, /Có chữ hoa/);
  assert.match(html, /Có chữ số/);
  assert.match(html, /Có ký tự đặc biệt/);
});

test("includes product-specific social metadata", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /property="og:title" content="Bếp Từ Video/);
  assert.match(html, /property="og:image" content="http:\/\/localhost(?::3000)?\/og\.png"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
});
