# Manual test plan — Bếp Từ Video

Ngày lập: 27/09/2026. Baseline: `ced873d`, branch `codex/prod-readiness`.
Trạng thái: **PLAN ONLY — tất cả test case chưa chạy (Not run)**.

Plan dựa trên code hiện tại của `/Applications/Data/Luan/BaseProject/web-anything`, không phải bản prototype trong `Documents/Anything`. PROD từng được deploy nhưng chưa xác nhận đang chạy đúng baseline này. Không dùng kết quả kiểm thử bản PROD cũ để xác nhận release candidate mới.

## 1. Mục tiêu và phạm vi

Kiểm tra toàn bộ tính năng đang có: trang chủ/demo, phân tích link Facebook bằng video hoặc thumbnail, hiển thị và sao chép kết quả AI, tài khoản và phiên đăng nhập, email dự phòng/xác minh/reset mật khẩu, sổ công thức, quyền sở hữu dữ liệu, giới hạn API, lỗi mạng/provider, giao diện và điều kiện vận hành release.

Không coi các tính năng chưa có là lỗi regression: upload video/ảnh từ máy, phát video trong app, sửa công thức, trang chi tiết công thức đã lưu, tìm kiếm/phân trang sổ công thức, đổi username, xóa tài khoản tự phục vụ, MFA và đăng nhập bằng email/social. Nút phát trên kết quả thật mở video gốc ở Facebook. Mỗi lần lưu thành công tạo một bản ghi mới; hiện không có dedup theo URL.

Một số kỳ vọng an toàn/UX là tiêu chí nghiệm thu: nếu code hiện tại không đạt thì ghi bug, không sửa expected result để cho pass. Đặc biệt kiểm tra nội dung demo không bị trình bày như đã phân tích video thật.

## 2. Môi trường và điều kiện bắt đầu

| Môi trường | Dùng cho | Điều kiện |
| --- | --- | --- |
| Local | Form, demo, UI, lỗi mạng, API kiểm soát được | Ghi URL thực tế; `APP_URL` khớp origin; D1 riêng đã migrate nếu test auth/save |
| Staging Worker/D1 | Full regression, email thật, Gemini, quota, migration, lỗi phụ thuộc | Site và D1 tách biệt PROD; synthetic accounts; đúng candidate commit; cùng kiểu runtime PROD |
| PROD | Smoke sau release đã được cho phép | Xác nhận version đang live, access policy, tài khoản test; không chạy thử giới hạn, chèn lỗi hay sửa DB |

Trước khi thực thi:

1. Ghi commit, URL, deployment version, browser/OS, thời điểm, người chạy và D1 binding. Xác nhận staging không trỏ vào DB PROD.
2. Xác nhận migrations đến `0006` cho candidate này; tên cấu hình `APP_URL`, `USER_ID_PEPPER`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `RESEND_API_KEY`, `EMAIL_FROM`. Không chụp/in giá trị secret. Không đổi pepper để test trên dữ liệu có sẵn.
3. Có hộp thư test nhận email thật và sender Resend được cấu hình. Thông báo “đã gửi” trên UI không đủ chứng minh delivery.
4. Có ít nhất hai browser profile độc lập A/B và một phiên anonymous. Đăng nhập ChatGPT để qua cổng owner-only của hosting (nếu có) tách biệt với đăng nhập username của app.
5. Khi được phép thực thi, chốt riêng phạm vi live Gemini vì có chi phí và gửi media sang Google. Plan này không thực hiện live call, tạo resource, thay config, migrate hay deploy.
6. Chỉ chèn dữ liệu, thay TTL, giả lập lỗi backend/provider trên môi trường riêng đã được cho phép; nếu thiếu công cụ/fixture thì đánh dấu **Blocked**, không ghi Pass.

Sites hiện trả `project not found` với connection đang dùng: các case cần kiểm soát hosting/D1 staging bị Blocked cho tới khi có quyền truy cập và môi trường phù hợp.

## 3. Quy ước thực thi và dữ liệu

- **P0**: luồng cốt lõi hoặc an toàn tài khoản/dữ liệu, chặn release nếu fail.
- **P1**: lỗi/biên và khả năng phục hồi quan trọng; phải xử lý hoặc có quyết định chấp nhận rõ ràng.
- **P2**: trải nghiệm phụ, trình bày; ghi rõ ảnh hưởng.
- **UI**: thao tác browser; **API**: DevTools hoặc API client cùng môi trường; **OPS**: cần hỗ trợ vận hành/fixture backend.
- **LIVE**: gọi Facebook/Gemini/email thật. **FIXTURE**: dữ liệu hoặc upstream giả lập có kiểm soát. Kết quả FIXTURE không thay thế LIVE.
- Mỗi biến thể ngăn bởi dấu `;` trong một case phải có kết quả riêng (`ID.a`, `ID.b`...). Không pass cả nhóm nếu mới thử một biến thể.
- Mặc định mỗi case bắt đầu với bucket rate-limit sạch, session đúng và dữ liệu biết trước. Chạy quota cuối cùng để không khóa các case khác.

| Fixture | Chuẩn bị |
| --- | --- |
| A0 | User chưa có email; mật khẩu test thỏa 5 quy tắc, không dùng mật khẩu thật |
| A1 | User có email chưa verify; inbox do tester kiểm soát |
| A2 | User có email đã verify, đăng nhập ở hai profile để test revoke sessions |
| B | User khác, có email riêng và recipe riêng; dùng kiểm tra ownership |
| E1/E2 | Hai địa chỉ test có inbox; thêm một email chưa đăng ký |
| V1 | Reel món ăn công khai, direct video đúng identity, <=14 MiB |
| V2 | Video món ăn có direct video >14 và <=100 MiB; ghi size thực tế |
| V3 | Video có thumbnail hợp lệ nhưng không có direct video |
| V4 | Nội dung công khai không phải món ăn |
| V5 | Link private/deleted/login-gated/region-blocked — ghi rõ biến thể |
| V6 | Các format `/reel/...`, `/watch?v=...`, `/<page>/videos/...`, `/share/r/...`, `/share/v/...`, `fb.watch/...` trỏ tới video đã biết |
| F-media | Fixture HTML có nhiều video/recommended video trước video yêu cầu; HD hỏng/SD tốt; metadata xung đột; media sai MIME/size; provider lỗi |
| F-recipes | Payload hợp lệ video và thumbnail, user có 99/100 recipes, một hàng DB có JSON hỏng; tạo trên DB riêng |
| F-time | Token còn hạn/hết hạn/đã dùng/sai purpose; session hết hạn; cache hết hạn. Đổi timestamp fixture trên DB riêng, không đổi clock/TTL PROD |

Lưu URL video và inbox trong hồ sơ QA riêng; file plan không chứa token, cookie, mật khẩu, secret, ảnh nhạy cảm hoặc dữ liệu cá nhân. Link mẫu `.../reel/1234567890` chỉ là dữ liệu demo, không phải V1.

## 4. Trình tự và thời lượng dự kiến

1. Xác nhận baseline/môi trường và chuẩn bị dữ liệu: 0,5–1 ngày, phụ thuộc quyền hosting.
2. Smoke: H01–H04, A01, A06, V01, R01, S02–S04, A09, E01/E04, P02/P04: khoảng 1–2 giờ khi có sẵn fixture.
3. Full regression UI/auth/email/save/media: 1–2 ngày.
4. API/security, lỗi provider, quota, migration/retention: 1–2 ngày với dev/operator hỗ trợ.
5. Cross-browser/mobile và retest bug: 0,5–1 ngày, tùy số lỗi.

Ước tính cho một tester, không tính thời gian khôi phục hosting/chờ sửa bug. Có thể tái sử dụng kết quả analyze còn hợp lệ để test UI/save, tránh gọi AI lặp lại. Không cần chờ 24 giờ/30 ngày nếu đã có fixture TTL riêng.

## 5. Trang chủ, demo và điều hướng

| ID | Ưu tiên / cách | Bước thực hiện | Kết quả mong đợi |
| --- | --- | --- | --- |
| H01 | P0 UI | Mở `/` anonymous, reload | Trang tải được; input, nút analyze/demo và đăng nhập để lưu hiện đúng; không lộ dữ liệu user khác |
| H02 | P1 UI | Click logo/header/footer; tab qua các điều khiển | Về đầu trang; không mất nội dung bất ngờ; nút/link dùng được |
| H03 | P0 UI | Mở Network, chọn “Xem thử với video mẫu” | Hiện dữ liệu demo; không gọi `/api/analyze`/Gemini; người dùng nhận biết rõ là minh họa |
| H04 | P0 UI/API | Lưu demo khi anonymous và khi logged-in; gửi payload có `promptVersion: sample` tới save API | UI báo không lưu demo; server từ chối; không tạo recipe |
| H05 | P1 UI | Anonymous chọn “Đăng nhập để lưu” trên header | Sang signin; có đường tới signup/forgot-password; return path về cùng site |
| H06 | P1 UI | Login user không có email; user chưa verify; user đã verify, mỗi lần reload `/` | Banner lần lượt là thêm email / gửi lại xác minh / không hiện; trạng thái không lẫn tài khoản |
| H07 | P1 UI | Bắt đầu analyze, double-click/Enter nhiều lần, thử demo trong lúc chờ | Analyze/demo bị chặn phù hợp; không phát nhiều request do submit lặp; loading kết thúc khi thành công/lỗi |
| H08 | P1 UI | Đang analyze V1, sửa input thành V3; xem kết quả và mở video gốc | Kết quả vẫn gắn với request đã gửi; không gán kết quả cũ cho URL mới; lần submit sau dùng input mới |
| H09 | P1 UI | Ngắt mạng cho `/api/session` và `/api/recipes` riêng, sau đó khôi phục/reload | Không crash/lộ dữ liệu; không báo thao tác thành công giả; ghi bug nếu lỗi tải bị trình bày như chắc chắn không có dữ liệu |

## 6. Đăng ký, đăng nhập và session

| ID | Ưu tiên / cách | Bước thực hiện | Kết quả mong đợi |
| --- | --- | --- | --- |
| A01 | P0 UI | Signup username mới và password đạt chuẩn | Chỉ cần username/password, không email/confirm; tạo tài khoản và login ngay; có cảnh báo chưa có email |
| A02 | P1 UI/API | Username độ dài 2/3/32/33; chữ hoa, khoảng trắng đầu/cuối; `.abc`, `_abc`, `a b`, ký tự có dấu | 3–32, bắt đầu chữ/số ASCII, chỉ chữ/số/`.`/`_`/`-`; trim/lowercase; invalid bị từ chối cả server |
| A03 | P0 UI/API | Signup lại username đã có, cả biến thể hoa/thường | Không tạo trùng; báo username đã dùng; user cũ không bị thay đổi |
| A04 | P1 UI/API | Password thiếu từng điều kiện: 8 ký tự, chữ thường, chữ hoa, số, special; chỉ whitespace thay special; 200/201 ký tự | Checklist phản hồi theo từng quy tắc; không nhận quá 200; bypass UI vẫn bị server từ chối; password hợp lệ được nhận |
| A05 | P1 UI | Bỏ trống field; show/hide password; paste/autofill; double submit; chặn request mạng rồi retry | Validation rõ; show/hide không thay giá trị; loading/disabled đúng; lỗi cho phép thử lại; không tạo account lặp |
| A06 | P0 UI | Signout rồi signin bằng username/password đúng; username hoa/thường và khoảng trắng đầu/cuối | Đăng nhập cùng tài khoản; user chưa verify vẫn được login; email không dùng làm login identifier |
| A07 | P0 UI/API | Username không tồn tại; username đúng/password sai; email thay username | Hai lỗi credentials không tiết lộ tài khoản có tồn tại; không phát session cho credential sai |
| A08 | P0 UI | Login A; reload, mở tab mới, đóng/mở lại browser profile; thử cookie bị sửa/hết hạn bằng fixture | Session hợp lệ được giữ tới expiry; token sai/hết hạn không được cấp quyền; UI hồi phục khi reload |
| A09 | P0 UI/API | Login A ở hai profile; signout profile 1; gọi API bảo vệ từ profile 1 và 2 | Profile 1 mất quyền, cookie/session bị revoke; profile 2 vẫn hợp lệ (signout chỉ một session) |
| A10 | P1 UI | Chặn signout request, click signout, khôi phục rồi retry | Báo thất bại, không giả vờ logout; retry thành công; không crash |
| A11 | P0 UI | Anonymous mở `/account`, login; thử signin/signup với `return_to=/account` và URL ngoài site, `//example.com`, đường auth | Return về `/account` khi hợp lệ; URL ngoài/auth loop fallback `/`; không open redirect |
| A12 | P1 UI | Mở trực tiếp auth pages khi đã login; Back/Forward sau login/logout; hai tab cùng profile | Không vòng lặp navigation; không có quyền từ UI cache sau logout; các request bảo vệ vẫn kiểm tra session |
| A13 | P1 UI/API | Password có ký tự Unicode tương đương NFKC; đăng ký rồi login bằng biến thể tương đương | Hash/verify nhất quán với chính sách normalize; không biến đổi username/password ngoài chính sách |
| A14 | P0 API | Xem cookie trên HTTPS; thử đọc từ JS và kiểm tra response/cache của session/auth | `bepvideo_session`: HttpOnly, Secure trên HTTPS, SameSite=Lax, lifetime 30 ngày; token không đọc được từ JS; identity/auth responses no-store |

## 7. Email dự phòng và xác minh

| ID | Ưu tiên / cách | Bước thực hiện | Kết quả mong đợi |
| --- | --- | --- | --- |
| E01 | P0 UI LIVE | A0 mở `/account`, nhập E1 và password hiện tại đúng, save | Email được lưu chuẩn hóa; UI cập nhật ngay “chưa xác minh”, xóa password field; E1 nhận email với origin từ `APP_URL` |
| E02 | P0 UI/API | Lưu/đổi email với password trống/sai; anonymous hoặc session hết hạn | Từ chối; email/verification state/token hiện hữu không bị thay đổi |
| E03 | P1 UI/API | Email sai format, trống, quá 254; email hoa/thường/space; email thuộc B | Validation/normalize đúng; email trùng B bị 409; không lấy email của B |
| E04 | P0 UI LIVE | Mở link verify hợp lệ từ inbox, về home/account và reload | Xác minh thành công; banner biến mất; không tự đăng nhập tài khoản khác; link chỉ xác minh đúng user/email |
| E05 | P0 UI/API FIXTURE | Link verify không token/sai token/hết 24h/đã dùng; token reset đưa vào verify | Báo không hợp lệ/hết hạn; không xác minh; không crash; có hướng gửi lại link |
| E06 | P1 UI LIVE | A1 dùng “Gửi lại email” trên home; nhận link mới và verify | Có email thực đến đúng inbox; verify được; lỗi gửi hiển thị rõ. Kiểm tra token cũ theo chính sách single-use/email version, không giả định mọi resend đều hủy token cũ |
| E07 | P0 UI/API LIVE | A2 đổi E1 sang E2 bằng password đúng; dùng link reset/verify cũ của E1 | E2 chưa verify; link E1 mất hiệu lực; E1 không khôi phục được account; verify E2 xong mới recovery bằng E2 |
| E08 | P0 UI/API FIXTURE | Đổi E1 → E2 → E1, rồi dùng link E1 được phát trước lần đổi đầu | Token cũ vẫn bị từ chối nhờ email version; không hồi sinh token khi email trở lại giá trị cũ |
| E09 | P1 UI OPS | Gỡ cấu hình email hoặc giả lập Resend lỗi trên staging; save email đúng rồi reload | Email vẫn lưu; UI báo chưa gửi được verify, trạng thái nhất quán; không lộ link/token vào log; phục hồi rồi resend được |
| E10 | P1 API | Resend khi anonymous; chưa có email; đã verified | Lần lượt 401; lỗi chưa có email; `alreadyVerified` không gửi thêm email |
| E11 | P1 UI | Save lại cùng địa chỉ email đã verified, password đúng | Theo code hiện tại: trở về chưa verify và yêu cầu xác minh lại; UI/header cập nhật tương ứng. Ghi UX concern nếu không phù hợp yêu cầu sản phẩm |
| E12 | P0 UI/API OPS | Hai profile đồng thời redeem cùng link verify; thử lỗi DB giữa transaction | Chỉ một redemption thành công; không trạng thái xác minh/token dùng dở; thiếu fixture thì Blocked |

## 8. Quên và đặt lại mật khẩu

| ID | Ưu tiên / cách | Bước thực hiện | Kết quả mong đợi |
| --- | --- | --- | --- |
| P01 | P1 UI/API | Email trống/sai format; email hợp lệ chưa đăng ký; email chưa verify | Invalid bị validation; hai email hợp lệ đều có thông báo chung; không gửi reset cho email chưa verify/không tồn tại |
| P02 | P0 UI LIVE | A2 yêu cầu forgot-password bằng email verified; mở inbox | Nhận link reset thật tới đúng origin, hạn 60 phút; UI không tiết lộ trạng thái account khác |
| P03 | P1 UI | Mở link hợp lệ, nhập password yếu; confirm khác; password hợp lệ trùng confirm | Dùng 5 quy tắc như signup; mismatch chặn submit; dữ liệu hợp lệ gửi được |
| P04 | P0 UI LIVE | Reset thành công khi A2 có hai sessions; thử password cũ/mới và API từ hai sessions cũ | Password cũ sai, mới login được; mọi session cũ bị revoke; không mất recipes; yêu cầu đăng nhập lại |
| P05 | P0 UI/API FIXTURE | Token thiếu/sai/hết 60 phút/đã dùng; token verify đưa vào reset | Không đổi password; link đã dùng không replay được; hướng yêu cầu link mới |
| P06 | P0 UI/API LIVE | Yêu cầu nhiều reset links, dùng một link; thử các link còn lại | Sau reset thành công, các auth tokens cũ bị vô hiệu; không thể đổi password lần nữa bằng link cũ |
| P07 | P0 API OPS | Gửi hai lần redeem cùng token gần đồng thời, password khác nhau | Chỉ một thành công; password cuối tương ứng giao dịch thành công; session revocation hoàn chỉnh |
| P08 | P0 API OPS | Giữ request signin cũ trong lúc reset; giải phóng request sau reset | Signin dựa trên password hash cũ không tạo session hợp lệ sau reset |
| P09 | P0 API OPS | Giả lập DB lỗi trong reset, sau đó kiểm tra password/session/token | Transaction rollback; không password mới với sessions cũ còn sống; retry sau phục hồi nhất quán |
| P10 | P1 UI OPS | Resend thiếu config/lỗi delivery khi forgot-password | Client vẫn nhận thông báo chung như email không tồn tại; log chỉ error code không nhạy cảm; không coi case này là delivery pass |

## 9. Nhập link và phân tích Facebook/Gemini

Các case LIVE dùng video công khai đã được phép. Với fixture upstream, giữ nguyên validation host/redirect; không thêm bypass vào bản release.

| ID | Ưu tiên / cách | Bước thực hiện | Kết quả mong đợi |
| --- | --- | --- | --- |
| V01 | P0 UI LIVE | Anonymous và logged-in lần lượt analyze V1 | 200, recipe đúng nguồn, `analysisMode: video`; UI ghi đa khung hình; không bắt login để analyze |
| V02 | P1 UI/API LIVE | Analyze từng format V6, có/không fragment và khoảng trắng ngoài URL | URL được validate/resolve đúng video; fragment bị bỏ. Nếu Facebook chặn, báo rõ; không mặc định mọi link public đều fetch được |
| V03 | P1 UI/API | Rỗng, text bất kỳ, URL >2.048 ký tự, non-Facebook, HTTP, `/l.php`, profile/page không video | Browser/server chặn hợp lý; không gọi Gemini cho input invalid; UI có thể sửa và retry |
| V04 | P0 API | URL userinfo/custom port; host giả như `facebook.com.example.com`; scheme `javascript:`/`data:` | 400; không fetch URL nguy hiểm, không tạo recipe |
| V05 | P0 UI LIVE | Analyze V3 hoặc fixture không có direct video nhưng thumbnail đúng nguồn | `analysisMode: thumbnail`; badge, description, warning, disclaimer nhất quán; không tuyên bố đã xem video |
| V06 | P0 UI LIVE | Analyze từng V5 và trường hợp không lấy được cả media/thumbnail | Báo lỗi phù hợp; không dùng Unsplash/sample/video khác để trả thành công |
| V07 | P0 UI LIVE | Analyze V4 | Không tạo công thức đồ ăn giả; khi AI xác định `isFood=false`, API 422; UI báo không nhận diện món ăn |
| V08 | P0 UI/API | Nhập trực tiếp URL demo `.../reel/1234567890` vào analyze | Đi qua luồng Facebook thật, không trả sample cố định; demo chỉ được kích hoạt bằng nút xem mẫu |
| V09 | P0 API OPS | F-media có recommended video trước requested video; canonical/resolved ID khác requested | Chỉ chọn media đúng identity; mismatch bị từ chối; không dựa thứ tự xuất hiện trong HTML để lấy video sai |
| V10 | P1 UI/API OPS | HD hỏng/SD đúng; cả hai hỏng nhưng thumbnail đúng | Thử tối đa hai candidate đúng video; SD thành công vẫn là video; cả hai hỏng mới thumbnail với nhãn rõ |
| V11 | P1 UI/API LIVE | Analyze V2, quan sát evidence upload/process/delete ở provider | Dùng Files API, kết quả video; file tạm được xóa sau hoàn tất; không chỉ dựa badge UI để pass |
| V12 | P1 API OPS | Video biên <=14 MiB/>14 MiB/100 MiB/>100 MiB; không Content-Length; length khai báo sai | Chọn transfer đúng; stream không vượt limit; media không xử lý được chỉ fallback thumbnail cùng nguồn nếu hợp lệ |
| V13 | P1 API OPS | Thumbnail >8 MiB, SVG, sai MIME; video sai MIME; upstream response quá lớn | Từ chối nội dung không hợp lệ/quá lớn; không crash/unbounded read; UI có lỗi hoặc fallback đúng chính sách |
| V14 | P0 API OPS | Gemini generation trả 401/403; 429; network timeout/5xx | Auth/config hoặc quota trả lỗi rõ; không biến lỗi auth/quota thành thumbnail success; loading kết thúc |
| V15 | P1 API OPS | Gemini trả JSON sai, candidate rỗng, schema thiếu field, calories không `~` | 502/lỗi có kiểm soát; không render/lưu recipe thiếu hợp lệ |
| V16 | P1 API OPS | Files API upload/process/status timeout/failed; sau upload generation lỗi; delete lỗi | File đã tạo được cleanup kể cả nhánh lỗi; delete lỗi có log không nhạy cảm; không âm thầm mất dấu file tồn đọng |
| V17 | P1 UI | Offline trước submit; mất mạng khi đang chờ; mạng chậm rồi phục hồi | Hiển thị lỗi, bỏ loading, thử lại được; không báo kết quả cũ là kết quả mới |
| V18 | P1 API OPS | Analyze cùng URL trong cache 30 phút; hết TTL; đổi prompt/model trên staging; cache JSON hỏng | Cache hợp lệ tái dùng đúng nguồn/mode; hết hạn/khác version/model không tái dùng sai; cache hỏng không trả recipe không hợp lệ |
| V19 | P1 UI/API LIVE | Video nhiều bước nấu, mốc giữa/cuối khác đầu; metadata chứa chỉ dẫn lạc đề | Kết quả phản ánh nội dung quan sát được, không chỉ thumbnail; không làm theo chỉ dẫn metadata; không quảng cáo đã đọc mọi frame (sampling 1 FPS) |

## 10. Kết quả công thức và clipboard

| ID | Ưu tiên / cách | Bước thực hiện | Kết quả mong đợi |
| --- | --- | --- | --- |
| R01 | P0 UI | Xem kết quả video và thumbnail | Có tên, mô tả, ảnh, thời gian, khẩu phần, calories ước tính, nguyên liệu, bước làm; mode khớp API |
| R02 | P1 UI | So sánh observations/assumptions/warnings với response | Hai nhóm phân biệt rõ; UI hiển thị tối đa 3 observations/assumptions hiện tại, không đổi nội dung; warnings và disclaimer hiện đúng |
| R03 | P1 UI FIXTURE | Confidence 54/55/79/80 và nội dung text dài sát giới hạn | Nhãn low/medium/high đúng ngưỡng; không trình bày như xác suất được kiểm định; text không tràn/cắt mất thao tác |
| R04 | P1 UI | Click icon copy và nút Sao chép; paste vào text editor | Đúng tên, nguyên liệu, các bước theo thứ tự, dấu tiếng Việt/newline; thông báo thành công chỉ khi clipboard ghi được |
| R05 | P1 UI | Từ chối clipboard permission hoặc môi trường không hỗ trợ; thử lại sau cho phép | Báo không sao chép được; không success giả; không crash |
| R06 | P0 UI | Click overlay ảnh/video gốc của kết quả thật và saved item | Mở Facebook URL đúng nguồn ở tab mới; `noopener/noreferrer`; demo không giả vờ mở video thật |
| R07 | P1 UI | Chặn tải ảnh/CDN hoặc dùng URL ảnh hết hạn; chuyển kết quả V1 → V3 → demo | Text/nút vẫn dùng được; dữ liệu và badge không trộn giữa kết quả; ghi lỗi nếu không phân biệt ảnh hỏng/thiếu |

## 11. Sổ công thức và ownership

| ID | Ưu tiên / cách | Bước thực hiện | Kết quả mong đợi |
| --- | --- | --- | --- |
| S01 | P1 UI | Anonymous bấm lưu kết quả thật, login rồi quay về | Được yêu cầu login; không lưu trái phép hoặc tự lưu demo. Hiện tại kết quả analyze không được bảo toàn qua reload; cần analyze lại để lưu, ghi UX gap nếu cần giữ draft |
| S02 | P0 UI | A lưu kết quả video và thumbnail, kể cả A chưa có/verify email | 201; item xuất hiện, count tăng; nút loading rồi phục hồi; không yêu cầu verify để save |
| S03 | P0 UI | Reload; logout/login A; mở profile khác đăng nhập A | Saved records vẫn còn từ D1, mới nhất trước; count/date đúng; không phụ thuộc localStorage |
| S04 | P0 UI/API | Xóa item A, reload; xóa lại ID cũ; ID malformed | Xóa thật 204 và count giảm; ID không tồn tại 404; malformed 400; item đã xóa không quay lại |
| S05 | P0 UI/API | A có recipe riêng, B login profile khác; B gọi list và DELETE ID của A | B chỉ thấy dữ liệu B; delete của A trả 404, dữ liệu A nguyên vẹn; không tin owner ID do client gửi |
| S06 | P0 API | Anonymous/session hết hạn gọi GET/POST/DELETE recipes; thêm header giả identity | 401, không đọc/ghi/xóa; header không thay thế session |
| S07 | P1 UI | Save đang pending, bấm nhiều lần; sau success chủ động save lần nữa | Không duplicate do double-click pending; lần save mới chủ động có thể tạo bản ghi mới (behavior hiện tại) |
| S08 | P1 UI | Chặn save/delete network trước khi server nhận; rồi retry | Báo lỗi; failed save không tăng count, failed delete không mất item; trạng thái hữu ích được giữ |
| S09 | P1 UI/API OPS | Server đã ghi/xóa nhưng response về client bị mất; reload trước khi retry | Dữ liệu thật được reconcile sau reload; ghi nhận save chưa có idempotency nên retry có thể tạo trùng; không nhầm thành mất dữ liệu |
| S10 | P0 UI/API FIXTURE | A có 99 recipes, lưu thứ 100 rồi 101; xóa một và lưu lại; hai save cạnh tranh ở 99 | Tối đa 100; vượt quota 409; xóa mở lại slot; hai request không vượt quota |
| S11 | P1 API FIXTURE | Payload hợp lệ sát 24.000 UTF-8 bytes và >24.000; có tiếng Việt multi-byte | Không vượt giới hạn byte; oversized 413; không tính theo số ký tự JS thay số byte |
| S12 | P0 API FIXTURE | Save với source/image URL `javascript:`, `data:`, HTTP, domain ngoài allowlist; `promptVersion: sample` | 400, không lưu; không có clickable URL nguy hiểm trong UI |
| S13 | P1 UI/API OPS | Trong DB riêng thêm recipe JSON hỏng/không hợp lệ giữa records tốt rồi load list | Record hỏng bị bỏ qua; records tốt vẫn hiển thị; không render payload nguy hiểm hay crash toàn bộ sổ |
| S14 | P1 UI | Saved list rỗng và 100 items; chọn header “Đã lưu”; ngày tạo gần nửa đêm | Empty state đúng; scroll tới section; bố cục và date theo locale không gây hiểu nhầm; không mong đợi pagination/detail chưa có |

## 12. API, giới hạn và bảo vệ dữ liệu

Dùng API client có session test và `Origin` hợp lệ khi kiểm tra business logic; thiếu Origin có thể bị chặn trước validation. Các ca malformed/giới hạn chạy trên staging riêng. Không giả lập bằng cách tắt security của candidate.

| ID | Ưu tiên / cách | Bước thực hiện | Kết quả mong đợi |
| --- | --- | --- | --- |
| Q01 | P0 API | Gọi từng POST auth/analyze/recipes và DELETE recipes với Origin thiếu/sai/ngoài site | Bị chặn trước thay đổi dữ liệu; origin đúng mới đi qua nghiệp vụ; không mở CORS để bypass |
| Q02 | P1 API | JSON sai, body rỗng, UTF-8 lỗi, sai field/type; analyze/auth >4.096 bytes | 400 hoặc 413 phù hợp; không stack trace/secret; không provider call cho body invalid |
| Q03 | P1 API OPS | Gửi body chunked/không length/length khai báo thấp vượt giới hạn; gửi body kéo dài >10 giây | Giới hạn theo byte thực; oversized 413; timeout 408 hoặc proxy chặn sớm có evidence; không treo Worker |
| Q04 | P1 API OPS | Thử từng rate limit trong bảng dưới với bucket sạch và đúng điều kiện; retry sau cửa sổ | Trong ngưỡng hoạt động, request vượt ngưỡng 429, hồi phục sau window; limit apply server-side, không chỉ disabled UI |
| Q05 | P0 API OPS | Bỏ D1 binding trên staging production-mode, thử auth/save/analyze | Fail closed; không mở phân tích vô hạn/in-memory thay PROD D1; lỗi cấu hình có kiểm soát |
| Q06 | P1 API OPS | Nhiều Worker instances chia cùng D1; thay `x-forwarded-for`; thử spoof `cf-connecting-ip` qua public ingress | Budget không reset theo instance/header tự khai; proxy overwrite trusted header; non-Cloudflare không tự tin IP giả |
| Q07 | P0 API OPS | Redirect Facebook/CDN tới host ngoài allowlist, loopback/private/metadata hoặc chuỗi redirect dài | Không truy cập đích bị cấm; từng redirect được validate; không đánh đổi safety để fetch được video |
| Q08 | P1 UI/API | Xem headers `/`, auth page, API success/error, redirect, 404 và image | CSP, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy theo policy; HSTS trên HTTPS; nếu hosting sở hữu response riêng, ghi rõ layer |
| Q09 | P1 API OPS | Request Host/proxy header giả; kiểm tra canonical/social URL và link email | Origin dùng `APP_URL`, không phản chiếu attacker Host; config production invalid không âm thầm fallback |
| Q10 | P0 API OPS | Xem log của success/error/auth/provider; kiểm tra bundle/client response/storage | Không có API key/password/session/auth token/email/media bytes/full Facebook URL trong log; token không nằm localStorage; DB lưu digest của token |
| Q11 | P1 UI/API FIXTURE | Dữ liệu text recipe/metadata có HTML/script-like text | Render như text, không chạy script; URL policy vẫn áp dụng; prompt injection không được xem là chỉ dẫn hệ thống |
| Q12 | P1 API | Kiểm tra success/error analyze; auth/session/recipe reads | Analyze có request ID khớp header/body, error code/message; JSON responses no-store; không cache dữ liệu tài khoản giữa users |

### Ma trận rate limit hiện tại

Mỗi threshold cần subcase riêng. Muốn test giới hạn IP cao hơn giới hạn user/email thì dùng nhiều identity fixture và bucket độc lập, tránh bị giới hạn thấp hơn che mất case cần kiểm tra. Không gửi 100 Gemini requests thật chỉ để test global budget; chuẩn bị bucket gần ngưỡng trên staging hoặc provider fixture.

| Endpoint / nhóm | Budget | Request bị chặn khi bucket sạch |
| --- | --- | --- |
| Analyze | 10/IP/10 phút | Request 11; kiểm tra `Retry-After` cho nhánh IP |
| Analyze cache miss | 100/site/giờ | Miss 101; cache hit không tiêu global budget nhưng vẫn chịu IP limit |
| Signup | 5/IP/giờ | Request 6 |
| Signin | 10/username/10 phút và 20/IP/10 phút | Request 11 theo user; 21 theo IP |
| Forgot-password | 3/email/giờ và 5/IP/giờ | Request 4 theo email; 6 theo IP |
| Set email | 5/user/giờ và 10/IP/giờ | Request 6 theo user; 11 theo IP |
| Resend verify | 3/user/giờ và 5/IP/giờ | Request 4 theo user; 6 theo IP |
| Verify token | 20/IP/giờ | Request 21 |
| Reset password | 10/IP/giờ | Request 11 |
| Save + delete recipe | Tổng 20 writes/user/phút | Write 21, không phải 20 cho từng endpoint |

## 13. Browser, mobile và accessibility

Full flow chính chạy trên Chrome desktop và Safari iOS; smoke form/analyze/save/email trên Safari macOS, Firefox desktop và Chrome Android. Ghi version thật, không chỉ tên browser. Viewport mục tiêu: 360/390 px mobile, 768 px tablet, 1280/1440 px desktop; test landscape và zoom 200%.

| ID | Ưu tiên / cách | Bước thực hiện | Kết quả mong đợi |
| --- | --- | --- | --- |
| U01 | P1 UI | Các viewport với home/result/saved/auth/account và text dài | Không horizontal overflow, overlap hoặc che nút; input/action dùng được khi bàn phím mobile bật |
| U02 | P1 UI | Dùng Tab/Shift+Tab/Enter/Space cho toàn bộ luồng; kiểm tra focus | Thứ tự focus hợp lý, thấy focus, không keyboard trap; icon-only có accessible name |
| U03 | P1 UI | VoiceOver/NVDA đọc label, lỗi, loading, toast và kết quả | Labels liên kết input; thông báo quan trọng được nhận biết; ảnh có mô tả phù hợp mode, không chỉ dựa màu |
| U04 | P2 UI | Bật reduced motion; zoom 200%; kiểm tra contrast và long content | Vẫn thao tác/đọc được; animation không cản trải nghiệm; không cắt warnings |
| U05 | P1 UI | Autofill/password manager, show/hide password, paste URL/email dài, Enter submit | Giá trị và validation đúng; không gửi form ngoài ý muốn; clipboard xử lý khác biệt browser |
| U06 | P1 UI | Refresh deep links `/account`, `/signin`, `/reset-password`, `/verify-email`; mở URL không tồn tại | Route tải/redirect đúng, không host 404 sai cho route hợp lệ; 404 thật không crash toàn app |
| U07 | P2 UI | Xem page title/favicon/social metadata; auth pages noindex | Branding đúng; canonical đúng origin; trang chứa auth/token không được khuyến khích index |

## 14. Migration, retention và kiểm tra vận hành

Các case này cần operator và staging thực; chỉ xem code hoặc local SQL adapter không đủ Pass. Không chạy mutation PROD trong full regression.

| ID | Ưu tiên / cách | Bước thực hiện | Kết quả mong đợi |
| --- | --- | --- | --- |
| O01 | P0 OPS | DB staging mới, apply migrations checked-in, signup/login/save/delete | Schema đủ; runtime không cần tự create/alter tables; luồng core hoạt động trên Worker/D1 thật |
| O02 | P0 OPS | Clone fixture DB phiên bản cũ, upgrade 0004/0005/0006 theo ledger | User IDs/passwords/recipes/verified flags/sessions hợp lệ được giữ; nullable email/index đúng; legacy tokens không có email version bị từ chối |
| O03 | P0 OPS | Restore backup fixture vào DB riêng; xác nhận dữ liệu và luồng login/recipe | Có bằng chứng restore hoạt động; không dùng backup PROD tùy tiện; xác định migration đã apply kể cả deployment fail |
| O04 | P1 OPS | Fixture expired session/token/cache/rate buckets, kích hoạt Worker maintenance | Record hết hạn không dùng được dù chưa cleanup; cleanup bounded tối đa 1.000/table/run, không xóa record còn hạn; low traffic không được quảng cáo là xóa ngay |
| O05 | P1 OPS LIVE | Ghi duration/CPU cho signin PBKDF2, video inline/Files API, thumbnail và email | Không vượt runtime limits/hết CPU; không có spinner vô hạn. Ghi p50/p95 nếu có đủ mẫu, không kết luận percentile từ 1–2 requests |
| O06 | P0 OPS | Kiểm tra role owner/khách ở cổng hosting và anonymous/logged-in trong app | Audience khớp cấu hình mong muốn; không nhầm hosting login với app auth; private URL không được quảng cáo là public |
| O07 | P1 OPS | Diễn tập support deletion trên account synthetic sau xác minh ownership | Xóa đúng user/recipes/sessions/tokens theo runbook, account B không ảnh hưởng; có support channel và lưu ý backup retention trước public launch |
| O08 | P0 OPS | Diễn tập rollback/forward fix candidate trên staging, thử token cũ và data | Không rollback sang binary chấp nhận stale recovery tokens; schema/data tương thích; có hướng restrict access nếu không có rollback an toàn |

## 15. Smoke PROD sau deploy được cho phép

Chỉ thực hiện khi candidate đã qua các gate và release được cho phép. Dùng test account, không thay đổi quyền truy cập site để tiện test.

1. Ghi live deployment version/commit và thời điểm; mở home và signin.
2. Login test account, đọc saved recipes, logout/login lại.
3. Một analyze video công khai đã được phép; xác nhận mode/source/warnings. Nếu chỉ nhận thumbnail, chưa xác nhận được video path.
4. Lưu rồi xóa một recipe do test account tạo, xác nhận count và persistence.
5. Email/reset bằng account chuyên dụng nếu nằm trong phạm vi smoke đã thống nhất; không reset tài khoản thật đang dùng.
6. Kiểm tra headers, request ID, lỗi Worker và latency/quota không nhạy cảm.
7. Nếu auth/ownership/core flow lỗi: dừng mở rộng release, áp dụng runbook; không tự down-migrate hoặc restore DB.

## 16. Ghi kết quả, bug và điều kiện hoàn tất

Tạo một bản kết quả riêng cho mỗi candidate/environment. Tất cả IDs trên bắt đầu là **Not run**; status chỉ đổi sau thực thi.

| Case/subcase | Priority | Environment / commit | Browser | Status | Actual result | Evidence / bug | Tester / time |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ví dụ A01 | P0 | Chưa xác định | Chưa xác định | Not run | — | — | — |

Status: **Not run / Pass / Fail / Blocked / N/A**. N/A cần lý do scope; không dùng N/A để bỏ qua tính năng đã có nhưng thiếu config. Blocked phải nêu dependency cụ thể, ví dụ thiếu inbox, chưa có staging D1 hoặc Sites inaccessible.

Mỗi bug ghi: ID case, commit/environment, preconditions, bước tái hiện, expected/actual, tần suất, browser, severity, screenshot/video hoặc request ID. Che token trong URL/email, cookie/Authorization và PII; không đính HAR thô chưa redact.

Exit criteria:

- Mọi case P0 trong phạm vi release Pass; không còn lỗi lộ dữ liệu, ownership, takeover, mất dữ liệu hoặc recipe sai nguồn.
- Mọi P1 được chạy, lỗi đã sửa/retest hoặc có chấp nhận rủi ro cụ thể; case Blocked quan trọng vẫn là gate chưa hoàn tất.
- Luồng video thật, thumbnail, Files API (nếu giữ trong release), delivery/verify/reset email và D1 thật có evidence riêng. Mock/UI demo không thay thế evidence này.
- Migration/restore/rollback và access policy có xác nhận operator; UI flow chính pass trên desktop/mobile mục tiêu.
- Tổng kết số case/subcase Pass/Fail/Blocked/Not run theo nhóm; liệt kê known limitations và bug còn mở. Không gọi “full feature pass” nếu còn nhóm chưa kiểm tra.
- Plan này bổ sung manual acceptance, không thay thế offline automated gates trong release runbook. Chưa chạy bất kỳ test nào khi lập tài liệu.

## 17. Nguồn đối chiếu

- [Product và giới hạn](../README.md)
- [Auth contract](auth.md), [Analyze API](api/analyze.md)
- [Testing strategy](testing.md), [Release readiness](release-readiness.md), [Release runbook](release-runbook.md)
- UI: `app/page.tsx`, `components/*`, các trang auth và `/account`.
- API/domain: `app/api/*`, `lib/auth/credentials.ts`, `lib/auth/return-path.ts`, `lib/facebook/url.ts`, `lib/ai/gemini.ts`, `db/recipes.ts`, `lib/http/api-response.ts`.

## 18. Kết quả lần chạy hỗ trợ đầu tiên

Ngày 27/09/2026 — local candidate `ced873d` cộng sửa fixture test ở `tests/unit/metadata.test.ts`; không chạy trên PROD và không gửi media/email tới dịch vụ ngoài.

| Hạng mục | Trạng thái | Bằng chứng / giới hạn |
| --- | --- | --- |
| `pnpm lint` | Pass | Chạy trong `pnpm verify` |
| `pnpm typecheck` | Pass | Chạy trong `pnpm verify` |
| `pnpm build` | Pass | Vinext build hoàn tất; còn notice upstream về `debugName` và static route classification |
| Unit tests | Pass, 117/117 | 18 files. Lượt đầu phát hiện fixture metadata mock thiếu `content-type: text/html`; đã chỉnh fixture trong `tests/unit/metadata.test.ts` để test canonical mismatch đúng response contract rồi chạy lại |
| Render tests | Pass, 6/6 | Home, signin/signup, password rules, social metadata và security headers |
| `pnpm verify` | Pass | Lint + typecheck + build + toàn bộ unit/render tests hoàn tất sau chỉnh fixture |
| H01 home local | Pass | Trang home render trên `http://localhost:3001`; `/api/session` trả 200. Không có D1 local nên không xác nhận auth/data |
| H03 demo local | Pass | Kích hoạt bằng bàn phím; tiêu đề và recipe sample hiện; server log chỉ có home/session trong lần demo, không có POST analyze |
| R04 copy sample | Pass | Bấm nút copy bằng bàn phím; UI hiện toast “Đã sao chép công thức” |
| V03 link ngoài Facebook | Pass | Gửi `https://example.com/not-a-video` trên origin đã khớp; UI báo chỉ nhận link video/Reel Facebook; local log POST `/api/analyze` 400, không gọi Gemini |
| A02/A04 signup UI | Partial | Trang signup render; mật khẩu yếu giữ nút disabled, mật khẩu `LocalQa!Strong9` làm nút enabled; không submit hoặc tạo account |
| A06 signin UI | Partial | Form signin và link forgot-password/signup render; không có D1 nên không xác thực account |
| P01 forgot-password UI | Partial | Trang và field email render; không gửi request/email |
| Lỗi origin khi port 3000 | Không tính lỗi sản phẩm | Lần đầu dev server dùng `localhost:3000` trong khi local default `APP_URL` là `localhost:3001`, gây 403 same-origin; chuyển dev server sang port 3001 thì invalid link cho 400 đúng kỳ vọng |
| Auth, session, email, saved recipes, quota, real D1/Worker | Blocked | `.openai/hosting.json` không có D1 binding; local email variables chưa có; Site staging chưa truy cập được |
| Live video/thumbnail/Gemini | Not run | Cần video public cụ thể và phê duyệt gửi media/metadata sang Google Gemini; không dùng sample URL giả |
| Cross-browser/mobile/accessibility | Not run | Browser smoke ban đầu chỉ xác nhận cây accessibility ở in-app viewport hiện tại |

Sau khi test local, đã dừng dev server. Test-fixture correction còn là thay đổi chưa commit; checkpoint `5dc9902` chỉ chứa plan ban đầu. Không có account hoặc dữ liệu user nào được tạo.
