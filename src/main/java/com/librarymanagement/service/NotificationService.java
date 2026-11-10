package com.librarymanagement.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.librarymanagement.dto.request.DeviceTokenRequest;
import com.librarymanagement.dto.response.NotificationResponse;
import com.librarymanagement.entity.Account;
import com.librarymanagement.entity.DeviceToken;
import com.librarymanagement.entity.Notification;
import com.librarymanagement.entity.NotificationType;
import com.librarymanagement.exception.ResourceNotFoundException;
import com.librarymanagement.exception.UnauthorizedException;
import com.librarymanagement.repository.AccountRepository;
import com.librarymanagement.repository.DeviceTokenRepository;
import com.librarymanagement.repository.NotificationRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

	private final NotificationRepository notificationRepository;
	private final DeviceTokenRepository deviceTokenRepository;
	private final AccountRepository accountRepository;

	// Lấy danh sách thông báo của tài khoản đang đăng nhập (phân trang)
	@Transactional(readOnly = true)
	public Page<NotificationResponse> getNotifications(String email, Pageable pageable) {
		Account account = getAccountByEmail(email);
		return notificationRepository.findByRecipient_IdOrderByIdDesc(account.getId(), pageable)
				.map(NotificationResponse::fromEntity);
	}

	// Đếm số lượng thông báo chưa đọc
	@Transactional(readOnly = true)
	public long getUnreadCount(String email) {
		Account account = getAccountByEmail(email);
		return notificationRepository.countByRecipient_IdAndIsReadFalse(account.getId());
	}

	// Đánh dấu 1 thông báo là đã đọc
	@Transactional
	public NotificationResponse markAsRead(String email, Long notificationId) {
		Account account = getAccountByEmail(email);
		Notification notification = notificationRepository.findByIdAndRecipient_Id(notificationId, account.getId())
				.orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông báo hoặc bạn không có quyền xem thông báo này!"));

		notification.setIsRead(true);
		Notification saved = notificationRepository.save(notification);
		return NotificationResponse.fromEntity(saved);
	}

	// Đánh dấu tất cả thông báo của tài khoản là đã đọc
	@Transactional
	public int markAllAsRead(String email) {
		Account account = getAccountByEmail(email);
		return notificationRepository.markAllAsRead(account.getId());
	}

	// Đăng ký token thiết bị di động (FCM)
	@Transactional
	public void registerDeviceToken(String email, DeviceTokenRequest request) {
		Account account = getAccountByEmail(email);
		String tokenStr = request.getToken().trim();
		String platform = request.getPlatform().trim().toUpperCase();

		DeviceToken token = deviceTokenRepository.findByToken(tokenStr)
				.orElse(new DeviceToken());

		token.setAccount(account);
		token.setToken(tokenStr);
		token.setPlatform(platform);
		if (request.getDeviceId() != null) {
			token.setDeviceId(request.getDeviceId().trim());
		}
		token.setLastActiveAt(LocalDateTime.now());

		deviceTokenRepository.save(token);
		log.info("Registered device token for account: {}, platform: {}", email, platform);
	}

	// Hủy đăng ký token thiết bị khi đăng xuất
	@Transactional
	public void unregisterDeviceToken(String email, String token) {
		Account account = getAccountByEmail(email);
		if (token != null && !token.trim().isEmpty()) {
			deviceTokenRepository.deleteByAccount_IdAndToken(account.getId(), token.trim());
			log.info("Unregistered device token for account: {}", email);
		}
	}

	// Lưu danh sách thông báo mượn sách cho các Admin/Staff có quyền BORROW_APPROVE ngay trong transaction mượn sách
	@Transactional
	public List<Notification> createBorrowRequestNotifications(
			List<Account> recipients,
			String batchCode,
			String memberFullName,
			List<String> bookTitles,
			Long firstBorrowRecordId) {

		if (recipients == null || recipients.isEmpty()) {
			return List.of();
		}

		String title = "Yêu cầu mượn sách mới";
		String content;
		if (bookTitles.size() == 1) {
			content = String.format("Độc giả %s vừa gửi yêu cầu mượn cuốn sách: \"%s\".",
					memberFullName, bookTitles.get(0));
		} else if (bookTitles.size() <= 3) {
			content = String.format("Độc giả %s vừa gửi yêu cầu mượn %d cuốn sách: %s.",
					memberFullName, bookTitles.size(), String.join(", ", bookTitles.stream().map(t -> "\"" + t + "\"").toList()));
		} else {
			content = String.format("Độc giả %s vừa gửi yêu cầu mượn %d cuốn sách gồm \"%s\", \"%s\" và %d cuốn khác.",
					memberFullName, bookTitles.size(), bookTitles.get(0), bookTitles.get(1), bookTitles.size() - 2);
		}

		List<Notification> createdNotifications = new ArrayList<>();
		for (Account recipient : recipients) {
			// Chống trùng ở mức nghiệp vụ bằng batchCode
			if (notificationRepository.existsByRecipient_IdAndReferenceTypeAndReferenceCode(
					recipient.getId(), "BORROW_BATCH", batchCode)) {
				continue;
			}

			Notification notification = new Notification();
			notification.setRecipient(recipient);
			notification.setTitle(title);
			notification.setContent(content);
			notification.setType(NotificationType.BORROW_REQUEST);
			notification.setReferenceId(firstBorrowRecordId);
			notification.setReferenceType("BORROW_BATCH");
			notification.setReferenceCode(batchCode);
			notification.setIsRead(false);

			createdNotifications.add(notificationRepository.save(notification));
		}

		return createdNotifications;
	}

	// Lưu danh sách thông báo trả sách cho các Admin/Staff có quyền RETURN_CONFIRM ngay trong transaction trả sách
	@Transactional
	public List<Notification> createReturnRequestNotifications(
			List<Account> recipients,
			Long borrowRecordId,
			String memberFullName,
			String bookTitle) {

		if (recipients == null || recipients.isEmpty()) {
			return List.of();
		}

		String title = "Yêu cầu trả sách mới";
		String content = String.format("Độc giả %s vừa gửi yêu cầu trả sách: \"%s\". Vui lòng kiểm tra và xác nhận nhận lại sách.",
				memberFullName, bookTitle);
		String referenceCode = "RETURN-REC-" + borrowRecordId;

		List<Notification> createdNotifications = new ArrayList<>();
		for (Account recipient : recipients) {
			// Chống trùng lặp bằng referenceCode và unique constraint
			if (notificationRepository.existsByRecipient_IdAndReferenceTypeAndReferenceCode(
					recipient.getId(), "RETURN_RECORD", referenceCode)) {
				continue;
			}

			Notification notification = new Notification();
			notification.setRecipient(recipient);
			notification.setTitle(title);
			notification.setContent(content);
			notification.setType(NotificationType.RETURN_REQUEST);
			notification.setReferenceId(borrowRecordId);
			notification.setReferenceType("RETURN_RECORD");
			notification.setReferenceCode(referenceCode);
			notification.setIsRead(false);

			createdNotifications.add(notificationRepository.save(notification));
		}

		return createdNotifications;
	}

	// Lưu thông báo mượn sách được phê duyệt cho chính độc giả sở hữu phiếu mượn
	@Transactional
	public Notification createBorrowApprovedNotification(
			Account recipient,
			Long borrowRecordId,
			Long bookId,
			String bookTitle,
			LocalDate dueDate) {

		if (recipient == null || borrowRecordId == null) {
			return null;
		}

		String referenceCode = "BORROW-APPROVED-" + borrowRecordId;
		if (notificationRepository.existsByRecipient_IdAndReferenceTypeAndReferenceCode(
				recipient.getId(), "BORROW_RECORD", referenceCode)) {
			log.info("Notification for approved borrow record {} already exists for account {}", borrowRecordId, recipient.getId());
			return null;
		}

		DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
		String formattedDueDate = dueDate != null ? dueDate.format(formatter) : "Theo quy định";

		String title = "Yêu cầu mượn sách đã được duyệt!";
		String content = String.format(
				"Yêu cầu mượn sách \"%s\" của bạn đã được phê duyệt thành công. Hạn trả: %s. Vui lòng đến thư viện nhận sách theo quy định.",
				bookTitle, formattedDueDate);

		Notification notification = new Notification();
		notification.setRecipient(recipient);
		notification.setTitle(title);
		notification.setContent(content);
		notification.setType(NotificationType.BORROW_APPROVED);
		notification.setReferenceId(borrowRecordId);
		notification.setReferenceType("BORROW_RECORD");
		notification.setReferenceCode(referenceCode);
		notification.setIsRead(false);

		Notification saved = notificationRepository.save(notification);
		log.info("Created BORROW_APPROVED notification id={} for recipient account={}", saved.getId(), recipient.getId());
		return saved;
	}

	@Transactional(readOnly = true)
	public Account getAccountByEmail(String email) {
		return accountRepository.findByEmail(email)
				.orElseThrow(() -> new UnauthorizedException("Không tìm thấy thông tin tài khoản đang đăng nhập!"));
	}

	@Transactional(readOnly = true)
	public Long getAccountIdByEmail(String email) {
		return accountRepository.findByEmail(email)
				.map(Account::getId)
				.orElseThrow(() -> new UnauthorizedException("Không tìm thấy thông tin tài khoản đang đăng nhập!"));
	}
}
