# Hướng dẫn bài 2: chuyển Library Management sang microservices

Ngày đối chiếu: 03/11/2026. Tài liệu này là hướng dẫn thực hành dựa trên source hiện tại; các service bên dưới chưa được tạo.

## 1. Đề bài yêu cầu gì?

Nguồn: `1. LỘ TRÌNH ĐÀO TẠO FRESHER JAVA_v4.pdf`, trang 11-12.

Giữ các chức năng bài 1 và bổ sung:

- `discovery-service`.
- `gateway-service`, đề ghi rõ Zuul.
- `auth-service`: login/logout.
- `user-service`: thông tin Account và Member.
- `book-service`: sách và thông tin mượn/trả.
- `socket-service`: member mượn/trả thì gửi notification cho admin.
- Giao tiếp giữa service bằng FeignClient và RestTemplate.
- User và Book kết nối hai schema khác nhau.
- Load balancing.

Nâng cao: HashiCorp Vault, Zipkin, đăng nhập Google/Facebook, xác thực hai yếu tố.

Kafka, Scheduler, Dockerfile/docker-compose và upload/download thuộc nội dung học ngày 41-50. Kafka không được ghi thành yêu cầu bắt buộc riêng trong đoạn mô tả bài 2. Theo lựa chọn của người học, hướng dẫn tập trung vào chuyên môn dựa trên PDF và source hiện tại, không phụ thuộc file chấm điểm.

## 2. Những điểm cần xác nhận với mentor

1. Có bắt buộc Zuul hay được dùng Spring Cloud Gateway? Người học hiện chưa hỏi mentor.
2. “Mỗi người chỉ được phép mượn 1 loại sách” trong bài 1 nghĩa là chỉ một đầu sách đang mượn, hay mỗi đầu sách chỉ một bản? Source hiện cho gửi nhiều bookId và chưa kiểm tra mượn trùng đầu sách ở các request khác nhau.
3. Maintenance chặn mọi API nghiệp vụ đến mức nào, và những API quản trị nào được phép dùng để tắt bảo trì?
4. Mức bảo đảm notification cần đạt: demo realtime khi các service đang chạy, hay cần lưu và gửi lại sau khi service gặp lỗi? Hướng dẫn trình bày cả hai mức để học theo thứ tự.

### Chọn bộ phiên bản

Source hiện dùng Java 17, Spring Boot 4.1.1. Spring Cloud Netflix đã bỏ starter Zuul từ release train 2020.0. Không thêm starter Zuul cũ trực tiếp vào POM Boot 4.

- Nếu mentor cho phép Gateway: có thể tiếp tục Java 17/Boot 4.1.x; bảng tương thích chính thức ghép với Spring Cloud 2025.1.x từ 2025.1.2. Chọn một bản vá tương thích và khóa bằng BOM ở parent POM.
- Nếu mentor bắt buộc Zuul: thống nhất bộ phiên bản legacy được mentor chấp nhận, hoặc gateway legacy chạy riêng. Phải kiểm tra tương thích thực tế trước khi chuyển source. Chưa có quyết định dùng nhánh này.
- RestTemplate đã deprecated trong Spring Framework 7, nhưng đề yêu cầu học nó. Có thể dùng cho một lời gọi nội bộ có giới hạn; không tự đổi toàn bộ sang RestClient rồi coi là đã đạt đề.

Nguồn chính thức:

- [Bảng Spring Boot / Spring Cloud](https://spring.io/projects/spring-cloud/).
- [Release notes loại bỏ Zuul](https://github.com/spring-cloud/spring-cloud-release/wiki/Spring-Cloud-2020.0-Release-Notes).
- [Các REST client của Spring](https://docs.spring.io/spring-framework/reference/integration/rest-clients.html).

## 3. Bài 1 hiện có những gì?

Backend có cấu trúc `controller -> service -> repository -> entity`, kèm DTO, exception, specification, security và aspect. Có 83 file Java chính, 7 file test, 15 migration SQL.

Các nhóm chức năng đã có code:

- Đăng ký Account và Member cùng transaction; xác minh email bằng link/OTP.
- Login, JWT chứa email/role/permissions; refresh token; logout blacklist token.
- Quên/đổi mật khẩu, đổi email, quản lý nhóm quyền.
- CRUD sách, import CSV dưới 5 MB, Criteria/Specification/native query.
- CRUD thành viên, khóa và xóa mềm, tìm theo nhiều điều kiện.
- Mượn/trả theo luồng `PENDING -> BORROWED -> RETURN_PENDING -> RETURNED`; có nhánh `REJECTED`, hạn trả 14 ngày và tính quá hạn.
- Maintenance filter, Log4j2/AOP, exception handler, Swagger, Liquibase.
- React web và React Native/Expo mobile dùng cùng backend.

Trong POM và Java source chưa có Spring Cloud, Eureka, Feign, RestTemplate, WebSocket hoặc Kafka.

### Kết quả kiểm tra đã chạy

- 20 test controller: **pass**, dùng JDK 17. Đây chủ yếu là test mock service, không xác nhận toàn bộ business logic, security filter hoặc rollback DB.
- `frontend: npm run build`: **pass**.
- `frontend: npm run lint`: **8 errors, 4 warnings**. Liên quan export của StatusBadge, setState trong effect và dependency của hook.
- Chưa chạy test Spring context kết nối DB, migration, luồng email thật hoặc ứng dụng mobile trên thiết bị.
- Terminal mặc định trỏ Java 8, trong khi dự án cần Java 17. Chạy test bằng cách đặt JAVA_HOME cho riêng phiên terminal; chưa đổi cấu hình hệ thống.

Lệnh chạy lại test controller tại thư mục gốc:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-17'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\mvnw.cmd '-Dtest=AuthControllerTest,BookControllerTest,BorrowControllerTest,MemberControllerTest,RoleControllerTest,SystemConfigControllerTest' test
```

### Các điểm cần xử lý trước hoặc trong lúc tách

| Điểm trong source | Vì sao cần chú ý |
| --- | --- |
| `EmailChangeService.confirmChangeEmail()` chưa so sánh `code` với mã đã lưu | Mã sai nhưng đủ 6 số vẫn có thể qua validation rồi đổi email; cần test mã sai/hết hạn/đã dùng |
| Mã đổi email gửi về email hiện tại | Khác yêu cầu PDF là gửi tới email mới; cần đưa hành vi về đúng yêu cầu được mentor chấp nhận |
| `TokenBlacklistService` dùng ConcurrentHashMap | Restart mất blacklist; nhiều instance không chia sẻ trạng thái logout |
| `JwtAuthencationFilter` đọc AccountRepository ở mỗi request | Không thể copy nguyên filter sang Book rồi cho Book đọc schema User |
| `BorrowRecord.member` là quan hệ JPA tới Member | Phải thay bằng ID khi Member thuộc service khác |
| `MemberSpecification.hasBorrowedBook()` dùng subquery BorrowRecord | Không còn query được như hiện tại sau khi tách schema |
| `MemberService.deleteMember()` đọc BorrowRecordRepository | Phải thay bằng giao tiếp với Book và xét tình huống gọi lỗi/đồng thời |
| Duyệt/trả đang đọc rồi cộng/trừ quantity, chưa có lock/version | Hai request đồng thời có thể làm sai tồn kho hoặc xử lý một phiếu hai lần |
| Migration chưa thấy tạo `accounts.is_delete` và seed `MEMBER_DELETE` | Source có dùng nhưng DB khởi tạo mới có thể thiếu; chưa kiểm tra DB thực tế |
| LoggingAspect chỉ che URI bắt đầu `/auth` | Alias `/api/auth` chưa được che tương đương; không ghi password/OTP/token vào log |
| Web `BookManagement` có lời gọi `loadBooks(page, searchFilters.title, searchFilters.isbn)` | Không khớp chữ ký nhận object filters; cần sửa và kiểm tra giữ bộ lọc sau thêm/sửa/xóa |

Không cần làm một đợt refactor toàn dự án để xử lý các điểm này. Sửa theo phần đang chuyển, có test chứng minh hành vi.

## 4. Ranh giới service đề xuất

Đây là thiết kế đề xuất để thực hiện bài, không phải kiến trúc đã có trong source.

| Service | Cổng local gợi ý | Trách nhiệm | Dữ liệu sở hữu |
| --- | --- | --- | --- |
| discovery-service | 8761 | Đăng ký và tìm địa chỉ instance bằng Eureka | Không cần DB nghiệp vụ |
| gateway-service | 8080 | Nhận request của web/mobile, route, CORS, kiểm soát maintenance tại cửa vào | Không đọc trực tiếp các bảng nghiệp vụ |
| user-service | 8082 | Account, Member, credentials, nhóm quyền, xác minh/reset/đổi email, cấu hình hệ thống | `library_user` |
| auth-service | 8083 | Login/logout/refresh, phát JWT, quản lý phiên và thu hồi token | `library_auth` đề xuất |
| book-service | 8084, instance 2: 8086 | Sách, tác giả, tồn kho, phiếu mượn/trả | `library_book` |
| socket-service | 8085 | Xác thực kết nối realtime và đẩy thông báo cho admin | Bản đơn giản chưa cần DB riêng |

Đề bắt buộc hai schema User/Book tách nhau; không cấm Auth có schema thứ ba. Schema Auth giúp phiên đăng nhập có một chủ sở hữu rõ ràng. Nếu mentor yêu cầu đúng hai schema, cần thống nhất lại nơi lưu trạng thái phiên qua API của chủ sở hữu, tránh cho nhiều service tự truy cập chung bảng.

Có thể đặt các schema trên cùng một MySQL server khi học. Tạo DB user riêng và cấp quyền đúng schema cho từng service. Mỗi service có Liquibase changelog riêng; giữ `ddl-auto=validate`.

### Chuyển những file nào?

- **User:** Account, Member, Role, Permission, PermissionGroup; các repository tương ứng; MemberService, RoleService; email verification/reset/change services và token; SystemConfigService và bảng cấu hình.
- **Auth:** phần login/logout/refresh của AuthController/AuthService; JwtService cần đổi đầu vào từ entity Account sang DTO; RefreshTokenService và blacklist cần thiết kế lại theo accountId và kho lưu bền vững.
- **Book:** Book, Author, BorrowRecord, BorrowStatus; BookService/BorrowService; repository tìm sách và phiếu mượn. Bỏ dependency tới entity/repository của User.
- **Gateway:** route, CORS và quy tắc maintenance ở cửa vào. Lấy cấu hình từ User qua API nội bộ có xác thực.
- **Socket/Discovery:** tạo mới.

Giữ controller/service/repository/dto/entity bên trong mỗi service. Không tạo thư viện dùng chung chứa toàn bộ JPA entity.

## 5. Cấu trúc project bài 2

Nên làm project bài 2 riêng để dễ chạy lại và so sánh với bài 1. Chưa di chuyển hay ghi đè source hiện tại.

```text
library-management-microservices/
  pom.xml                    # parent: version và dependency management
  discovery-service/
  gateway-service/
  user-service/
  auth-service/
  book-service/
  socket-service/
  docker-compose.yml         # thêm sau khi chạy local thành công
```

Mỗi thư mục service có POM và Application class riêng. Parent POM quản lý Spring Boot và Spring Cloud BOM; mỗi service chỉ khai báo dependency cần cho nó. Gateway dùng WebFlux thì không copy JPA/MVC/business service của monolith vào gateway.

## 6. Lộ trình làm theo từng chặng

### Chặng 1: Discovery

Mục tiêu: hiểu service registry trước khi chuyển nghiệp vụ.

1. Sau khi chốt stack, tạo `discovery-service` với Eureka Server.
2. Đặt `spring.application.name=discovery-service`, cổng 8761.
3. Bật Eureka server bằng `@EnableEurekaServer`.
4. Cấu hình registry local đơn:

```yaml
server:
  port: 8761
spring:
  application:
    name: discovery-service
eureka:
  client:
    register-with-eureka: false
    fetch-registry: false
```

**Đạt khi:** mở được dashboard Eureka; giải thích được registry khác gateway ở đâu. Discovery không phải nơi frontend gọi API nghiệp vụ.

### Chặng 2: Một service tối thiểu và gateway

1. Tạo User tối thiểu, chưa nối DB; thêm endpoint ping local để kiểm tra hạ tầng.
2. Cho User đăng ký Eureka bằng tên `user-service`.
3. Tạo Gateway, đăng ký Eureka, route tới service theo tên.
4. Với nhánh Spring Cloud Gateway được mentor chấp nhận, dùng URI `lb://user-service` và Spring Cloud LoadBalancer. Cấu hình đúng namespace của phiên bản đã chọn.
5. Kiểm tra request qua gateway đến được User; sau khi thử xong, xóa hoặc giới hạn endpoint ping.

**Đạt khi:** gọi qua cổng 8080 nhận được phản hồi User; không hardcode địa chỉ 8082 trong route cuối cùng.

### Chặng 3: Tách User và schema User

1. Chốt danh sách bảng User và viết migration tạo schema mới dưới dạng script để review.
2. Giải thích migration rồi mới áp dụng lên DB học riêng. Không chạy migration bài 2 vào DB bài 1.
3. Chuyển Account/Member/permission và các DTO/repository/service liên quan.
4. Giữ đăng ký Account + Member + verification token trong transaction local của User.
5. Mật khẩu được BCrypt tại User. Tạo API nội bộ xác minh credentials trả về ID/trạng thái/quyền; không trả password hash.
6. Viết API đọc Member theo accountId và đọc nhiều Member theo danh sách ID.
7. Mọi API nội bộ phải xác thực service gọi; prefix `/internal` tự nó không tạo bảo mật. Không route public các API này qua Gateway.

**Đạt khi:** User chạy bằng tài khoản DB chỉ có quyền schema User; CRUD/search/validation hoạt động; không cần đọc bảng Book.

### Chặng 4: Tách Auth

Luồng login đề xuất:

```text
Web/Mobile -> Gateway -> Auth
Auth -> Feign -> User: kiểm tra credentials, trạng thái, permissions
User -> Auth: accountId, memberId nếu có, email, role, permissions
Auth -> lưu phiên/refresh token -> phát JWT -> trả client
```

1. Dùng `@FeignClient(name = "user-service")`; cấu hình connect/read timeout, không hardcode URL trong nhánh chạy discovery.
2. Auth không có AccountRepository. User là nơi sửa Account; Auth sở hữu phiên/token.
3. Để giảm sửa client, ban đầu giữ `sub=email`, `role`, `permissions` và bổ sung `accountId`, `memberId`, `jti`, `iss`, `aud` với kiểm tra tương ứng. ID dùng cho liên kết nghiệp vụ để đổi email không làm đứt tham chiếu.
4. Với các URL `/auth/register`, `/auth/verify-email`, `/auth/change-password`..., có thể giữ AuthController làm facade gọi User. Việc tạo/sửa dữ liệu tài khoản vẫn thực hiện trong User.
5. Refresh phải lấy lại trạng thái Account và quyền hiện tại; tài khoản khóa/xóa không được cấp token mới.
6. Logout phải thu hồi refresh token và vô hiệu access token trên mọi instance đến khi token hết hạn. Bản đơn giản: Auth lưu hash token/jti đã thu hồi trong DB của Auth; API kiểm tra phiên nội bộ dùng dữ liệu đó. Redis có TTL là lựa chọn tiếp theo nếu cần, không phải điều kiện đầu tiên.
7. Service nghiệp vụ kiểm tra chữ ký/hạn/quyền của JWT, và kiểm tra trạng thái phiên qua Auth nếu cần giữ hiệu lực logout ngay. Có thể dùng RestTemplate cho lời gọi trạng thái phiên này để thực hành yêu cầu của đề. Đặt timeout; Auth lỗi thì trả lỗi phụ thuộc, không tự cho token qua.
8. Tránh vòng gọi xác thực: các API nội bộ của Auth/User dùng danh tính service riêng, không đi ngược lại chuỗi introspection của end-user. Auth introspection kiểm tra phiên trực tiếp, không tự gọi lại chính endpoint đó.
9. Không tin header tự khai `X-User-Id` từ client. Không đưa token/password/OTP vào log. Với môi trường triển khai, lời gọi credentials phải được bảo vệ bằng TLS và xác thực giữa service.

**Đạt khi:** login, refresh, logout hoạt động qua Gateway; token đã logout bị từ chối cả khi request vào instance khác hoặc sau restart.

### Chặng 5: Tách Book và mượn/trả

1. Chuyển sách/tác giả/phiếu mượn sang schema Book; không copy bảng Member sang làm nguồn dữ liệu chính thứ hai.
2. Thay quan hệ Member trong BorrowRecord bằng trường ID:

```java
// Mô tả mapping dự kiến trong Book; chưa áp dụng lên source/DB.
@Column(name = "member_id", nullable = false)
private Long memberId;
```

3. Giữ quan hệ JPA BorrowRecord -> Book vì cả hai thuộc Book. Không tạo foreign key xuyên schema tới bảng Member.
4. Thay `getMemberByEmail()` bằng việc lấy accountId đã xác thực và gọi User lấy memberId/trạng thái. Không nhận memberId từ body rồi tin đó là người đang đăng nhập.
5. Tạo phiếu PENDING chưa trừ kho; duyệt mới trừ, xác nhận trả mới cộng như code hiện tại.
6. Khi duyệt/trả, khóa bản ghi hoặc dùng version/conditional update phù hợp; trạng thái phiếu và quantity phải đổi cùng transaction local. Test hai request duyệt/trả đồng thời, cả trường hợp xử lý cùng phiếu hai lần.
7. Khi cần tên thành viên để hiển thị, lấy theo lô qua User rồi ghép vào BorrowResponse, tránh một lời gọi cho mỗi dòng. Tìm theo memberName có thể lấy tập memberId từ User rồi lọc trong Book trước khi phân trang.
8. Thay `MemberSpecification.hasBorrowedBook()` bằng Book API lấy memberId theo bookId, rồi User kết hợp điều kiện và phân trang. Không lấy một trang trước rồi lọc trên trang đó. Tập ID lớn cần cơ chế phân lô/read model; bản học cần ghi rõ giới hạn dữ liệu.
9. User xóa mềm thành viên phải hỏi Book về sách chưa trả; nếu Book không trả lời thì chưa xóa. Kiểm tra này qua HTTP vẫn có khoảng đua với mượn/duyệt đồng thời: nếu cần bảo đảm tuyệt đối, bổ sung trạng thái ngừng hoạt động và quy trình phối hợp giữa hai service, có test tương ứng.
10. Giữ error contract rõ ràng: thành viên không tồn tại khác User service bị timeout. Không biến lỗi phụ thuộc thành “không có thành viên”.

**Đạt khi:** Book chỉ có quyền schema Book; mượn/trả và tìm kiếm liên quan Member vẫn hoạt động qua API.

### Chặng 6: Socket và notification

Luồng tối thiểu:

```text
Member gửi yêu cầu mượn/trả -> Gateway -> Book
Book commit transaction thành công
Book gửi notification nội bộ -> Socket -> WebSocket/STOMP -> Admin
```

1. Tạo Socket với Spring WebSocket/STOMP.
2. Admin kết nối và subscribe một destination riêng, ví dụ `/topic/admin/borrow-events`.
3. Xác thực JWT và kiểm tra quyền admin ở CONNECT/SUBSCRIBE. Tên topic có chữ admin không thay thế kiểm tra quyền.
4. Với trình duyệt, gửi token trong STOMP CONNECT và xử lý bằng ChannelInterceptor; không giả định WebSocket browser cho đặt Authorization header tùy ý ở handshake.
5. Book phát các sự kiện `BORROW_REQUESTED`, `RETURN_REQUESTED`; có thể thêm `BORROW_APPROVED`, `RETURN_CONFIRMED` nếu cần.
6. Chỉ gửi sau commit. Dữ liệu gợi ý: eventId, type, borrowRecordId, memberId, bookId, occurredAt; không gửi thông tin xác thực.
7. Notification lỗi sau commit không làm giả kết quả nghiệp vụ thành thất bại. Bản gọi HTTP sau commit có thể mất thông báo khi tiến trình dừng hoặc Socket lỗi; phải ghi rõ giới hạn demo.
8. Khi học tiếp giao nhận tin cậy: lưu outbox cùng transaction Book, có worker retry publish, Socket deduplicate eventId. Có thể dùng Kafka cho bước này. Kafka đơn lẻ không tự giải quyết khoảng trống giữa commit DB và publish.
9. Nếu chạy nhiều instance Socket, cần broker/fan-out dùng chung; simple broker trong bộ nhớ mỗi instance không tự broadcast sang instance khác. Demo ban đầu chỉ chạy một Socket.

**Đạt khi:** mở hai trình duyệt, admin ở một bên và member ở bên còn lại; member mượn/trả thì admin nhận thông báo mà không reload; user thường không subscribe được kênh admin.

Nguồn: [STOMP token authentication của Spring](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/authentication-token-based.html).

### Chặng 7: Load balancing và duy trì giao diện

1. Chạy hai instance Book cùng application name, khác cổng và instance ID.
2. Dùng chung schema Book do Book sở hữu. Eureka phải hiện hai instance.
3. Route Gateway và Feign dùng service name/LoadBalancer. Eureka đăng ký được hai instance chưa đủ để chứng minh đã cân bằng tải.
4. Gắn instanceId vào log hoặc response header demo; gửi nhiều request đọc qua Gateway và quan sát cả hai instance xử lý.
5. Dừng một instance, chờ registry cập nhật và xác nhận request tiếp tục hoạt động. Ghi rõ thời gian phát hiện lỗi; không hứa failover tức thì.
6. Web giữ URL Gateway tại 8080; sau này đưa hai base URL hardcode trong `authApi.js` và `axiosClient.js` về cấu hình môi trường thống nhất. Mobile cấu hình IP của Gateway.
7. Giữ các path bên dưới và response fields hiện tại trong giai đoạn chuyển để tái sử dụng giao diện.

| Path client đang dùng | Đích đề xuất |
| --- | --- |
| `/auth/**`, `/api/auth/**` | Auth; một số nghiệp vụ Account được facade chuyển sang User |
| `/api/members/**` | User |
| `/api/admin/roles/**` | User |
| `/api/system-config/**` | User, Gateway lấy trạng thái qua API nội bộ |
| `/api/books/**`, `/api/borrow/**` | Book |
| Endpoint WebSocket mới | Socket |

Maintenance cần trạng thái nhất quán giữa các Gateway instance; nếu dùng cache phải có cách cập nhật và giới hạn độ trễ rõ ràng. Nếu các service còn có cổng truy cập từ client, phải chặn truy cập trực tiếp hoặc thực thi chính sách bảo trì ở đó. Không để User/Book đọc chung bảng cấu hình chỉ để tiện.

### Chặng 8: Đóng gói và kiểm tra đủ bài 1

1. Mỗi service có test nghiệp vụ, controller/security và migration riêng phù hợp phạm vi.
2. Test hợp đồng giữa Auth/User, Book/User và Book/Socket, gồm timeout và response lỗi.
3. Viết Dockerfile cho từng service; compose cho MySQL và các service. Trong container dùng DNS service name, không dùng localhost để trỏ sang container khác.
4. Cấu hình secrets qua biến môi trường; làm Vault ở phần nâng cao nếu có yêu cầu. Không commit mật khẩu/JWT signing key.
5. Bổ sung tracing Zipkin sau khi luồng chính ổn định; truyền trace context qua HTTP client và gateway.
6. Cuối cùng mới làm Google/Facebook login và 2FA.

## 7. Những tình huống bắt buộc kiểm thử

- Chưa verify không login; mã verify/reset/đổi email sai hoặc hết hạn phải bị từ chối.
- Logout xong access token và refresh token cũ không còn dùng được ở các instance khác.
- User không được CRUD sách, phân quyền tài khoản hoặc nghe topic admin.
- Account đã khóa/xóa không mượn được, không refresh được; phân biệt mất quyền với token hết hạn.
- Hai người cùng mượn/được duyệt khi kho chỉ còn một cuốn: quantity và số phiếu được duyệt phải đúng.
- Duyệt/trả cùng phiếu hai lần không làm tồn kho cộng/trừ hai lần.
- Một batch có sách không hợp lệ: không lưu một phần ngoài chủ ý.
- User service ngừng: Book trả lỗi phụ thuộc phù hợp, không tạo dữ liệu mượn thiếu kiểm tra.
- Socket ngừng: nghiệp vụ đã commit vẫn phản ánh đúng kết quả; mức bảo đảm thông báo khớp cách triển khai.
- Search Member theo bookId và search Borrow theo memberName vẫn đúng tổng số/phân trang sau khi tách DB.
- CSV sai định dạng, file rỗng, bằng/vượt 5 MB; dữ liệu lỗi phải rollback theo chính sách đã chọn.
- Migration chạy được từ schema rỗng, không phụ thuộc cột/quyền đã thêm thủ công trên máy.
- Bật/tắt maintenance có hiệu lực theo chính sách, không khóa mất đường quản trị để tắt.
- Chạy lại các luồng chính trên web và mobile; build pass không thay thế kiểm tra API thực tế.

## 8. Bước nên làm ngay

1. Chốt lựa chọn Zuul hoặc Spring Cloud Gateway và bộ phiên bản tương thích. Việc học ranh giới service và quyền sở hữu dữ liệu có thể bắt đầu ngay.
2. Chỉnh terminal/IDE dùng JDK 17 cho project này.
3. Tự vẽ lại danh sách dữ liệu thuộc User/Auth/Book và giải thích được ba chỗ đang truy vấn chéo: BorrowRecord.member, MemberSpecification.hasBorrowedBook, MemberService.deleteMember.
4. Tạo Discovery đầu tiên sau khi chốt phiên bản; đạt chặng 1 rồi mới sang chặng 2.

Mỗi chặng nên có một commit và một bài demo nhỏ. `@Transactional` chỉ đảm bảo transaction local trong thiết kế này; không rollback thay cho một service khác đã commit qua Feign/RestTemplate.
