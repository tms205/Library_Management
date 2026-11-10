package com.librarymanagement.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import com.librarymanagement.dto.request.DeviceTokenRequest;
import com.librarymanagement.dto.response.NotificationResponse;
import com.librarymanagement.entity.NotificationType;
import com.librarymanagement.service.NotificationService;
import com.librarymanagement.service.SseNotificationService;

class NotificationControllerTest {

	private NotificationService notificationService;
	private SseNotificationService sseNotificationService;
	private NotificationController notificationController;
	private Authentication authentication;

	@BeforeEach
	void setUp() {
		notificationService = Mockito.mock(NotificationService.class);
		sseNotificationService = Mockito.mock(SseNotificationService.class);
		notificationController = new NotificationController(notificationService, sseNotificationService);
		authentication = Mockito.mock(Authentication.class);
		when(authentication.getName()).thenReturn("admin@library.com");
	}

	@Test
	void getNotifications_ShouldReturnPagedNotifications() {
		NotificationResponse responseDto = new NotificationResponse(
				1L, 10L, "Yêu cầu mượn sách mới", "Độc giả gửi yêu cầu",
				NotificationType.BORROW_REQUEST, 100L, "BORROW_BATCH", "REQ-1", false, LocalDateTime.now());

		Page<NotificationResponse> page = new PageImpl<>(List.of(responseDto));
		when(notificationService.getNotifications(eq("admin@library.com"), any())).thenReturn(page);

		ResponseEntity<Page<NotificationResponse>> response = notificationController.getNotifications(authentication, 0, 10);

		assertEquals(200, response.getStatusCode().value());
		assertNotNull(response.getBody());
		assertEquals(1, response.getBody().getTotalElements());
		assertEquals("Yêu cầu mượn sách mới", response.getBody().getContent().get(0).getTitle());
	}

	@Test
	void getUnreadCount_ShouldReturnCount() {
		when(notificationService.getUnreadCount("admin@library.com")).thenReturn(4L);

		ResponseEntity<Map<String, Object>> response = notificationController.getUnreadCount(authentication);

		assertEquals(200, response.getStatusCode().value());
		assertNotNull(response.getBody());
		assertEquals(4L, response.getBody().get("unreadCount"));
	}

	@Test
	void markAsRead_ShouldReturnUpdatedNotification() {
		NotificationResponse responseDto = new NotificationResponse(
				1L, 10L, "Tiêu đề", "Nội dung",
				NotificationType.BORROW_REQUEST, 100L, "BORROW_BATCH", "REQ-1", true, LocalDateTime.now());

		when(notificationService.markAsRead("admin@library.com", 1L)).thenReturn(responseDto);

		ResponseEntity<NotificationResponse> response = notificationController.markAsRead(authentication, 1L);

		assertEquals(200, response.getStatusCode().value());
		assertNotNull(response.getBody());
		assertEquals(true, response.getBody().getIsRead());
	}

	@Test
	void markAllAsRead_ShouldReturnSuccess() {
		when(notificationService.markAllAsRead("admin@library.com")).thenReturn(5);

		ResponseEntity<Map<String, Object>> response = notificationController.markAllAsRead(authentication);

		assertEquals(200, response.getStatusCode().value());
		assertNotNull(response.getBody());
		assertEquals(5, response.getBody().get("updatedCount"));
	}

	@Test
	void registerDeviceToken_ShouldReturnSuccess() {
		DeviceTokenRequest request = new DeviceTokenRequest("token-xyz", "ANDROID", "device-1");

		ResponseEntity<Map<String, String>> response = notificationController.registerDeviceToken(authentication, request);

		assertEquals(200, response.getStatusCode().value());
		verify(notificationService).registerDeviceToken("admin@library.com", request);
	}

	@Test
	void unregisterDeviceToken_ShouldReturnSuccess() {
		ResponseEntity<Map<String, String>> response = notificationController.unregisterDeviceToken(authentication, "token-xyz");

		assertEquals(200, response.getStatusCode().value());
		verify(notificationService).unregisterDeviceToken("admin@library.com", "token-xyz");
	}
}
