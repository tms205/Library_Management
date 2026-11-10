package com.librarymanagement.controller;

import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.librarymanagement.dto.request.DeviceTokenRequest;
import com.librarymanagement.dto.response.NotificationResponse;
import com.librarymanagement.entity.Account;
import com.librarymanagement.service.NotificationService;
import com.librarymanagement.service.SseNotificationService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/notifications")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class NotificationController {

	private final NotificationService notificationService;
	private final SseNotificationService sseNotificationService;

	// Lấy danh sách thông báo phân trang của tài khoản hiện tại
	@GetMapping
	public ResponseEntity<Page<NotificationResponse>> getNotifications(
			Authentication authentication,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size) {

		String email = authentication.getName();
		Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, Math.min(size, 50)));
		Page<NotificationResponse> response = notificationService.getNotifications(email, pageable);

		return ResponseEntity.ok(response);
	}

	// Lấy số lượng thông báo chưa đọc
	@GetMapping("/unread-count")
	public ResponseEntity<Map<String, Object>> getUnreadCount(Authentication authentication) {
		String email = authentication.getName();
		long unreadCount = notificationService.getUnreadCount(email);

		return ResponseEntity.ok(Map.of("unreadCount", unreadCount));
	}

	// Đánh dấu 1 thông báo là đã đọc
	@PutMapping("/{id}/read")
	public ResponseEntity<NotificationResponse> markAsRead(
			Authentication authentication,
			@PathVariable Long id) {

		String email = authentication.getName();
		NotificationResponse response = notificationService.markAsRead(email, id);

		return ResponseEntity.ok(response);
	}

	// Đánh dấu tất cả thông báo là đã đọc
	@PutMapping("/read-all")
	public ResponseEntity<Map<String, Object>> markAllAsRead(Authentication authentication) {
		String email = authentication.getName();
		int updated = notificationService.markAllAsRead(email);

		return ResponseEntity.ok(Map.of("message", "Đã đánh dấu tất cả thông báo là đã đọc!", "updatedCount", updated));
	}

	// Stream SSE nhận thông báo thời gian thực qua Authorization Bearer header
	@GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
	public SseEmitter streamNotifications(Authentication authentication) {
		String email = authentication.getName();
		Long accountId = notificationService.getAccountIdByEmail(email);

		return sseNotificationService.createEmitter(accountId);
	}

	// Đăng ký native FCM device token
	@PostMapping("/device-token")
	public ResponseEntity<Map<String, String>> registerDeviceToken(
			Authentication authentication,
			@Valid @RequestBody DeviceTokenRequest request) {

		String email = authentication.getName();
		notificationService.registerDeviceToken(email, request);

		return ResponseEntity.ok(Map.of("message", "Đăng ký thiết bị nhận thông báo thành công!"));
	}

	// Hủy đăng ký native FCM device token khi đăng xuất
	@DeleteMapping("/device-token")
	public ResponseEntity<Map<String, String>> unregisterDeviceToken(
			Authentication authentication,
			@RequestParam String token) {

		String email = authentication.getName();
		notificationService.unregisterDeviceToken(email, token);

		return ResponseEntity.ok(Map.of("message", "Hủy liên kết thiết bị thành công!"));
	}
}
