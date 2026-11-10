package com.librarymanagement.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.librarymanagement.dto.request.DeviceTokenRequest;
import com.librarymanagement.dto.response.NotificationResponse;
import com.librarymanagement.entity.Account;
import com.librarymanagement.entity.DeviceToken;
import com.librarymanagement.entity.Notification;
import com.librarymanagement.entity.NotificationType;
import com.librarymanagement.entity.Role;
import com.librarymanagement.repository.AccountRepository;
import com.librarymanagement.repository.DeviceTokenRepository;
import com.librarymanagement.repository.NotificationRepository;

class NotificationServiceTest {

	private NotificationRepository notificationRepository;
	private DeviceTokenRepository deviceTokenRepository;
	private AccountRepository accountRepository;
	private NotificationService notificationService;

	private Account mockAccount;

	@BeforeEach
	void setUp() {
		notificationRepository = Mockito.mock(NotificationRepository.class);
		deviceTokenRepository = Mockito.mock(DeviceTokenRepository.class);
		accountRepository = Mockito.mock(AccountRepository.class);

		notificationService = new NotificationService(
				notificationRepository,
				deviceTokenRepository,
				accountRepository);

		mockAccount = new Account();
		mockAccount.setId(10L);
		mockAccount.setEmail("staff@library.com");
		mockAccount.setRole(Role.ADMIN);
		mockAccount.setEnabled(true);

		when(accountRepository.findByEmail("staff@library.com")).thenReturn(Optional.of(mockAccount));
	}

	@Test
	void getNotifications_ShouldReturnPagedResponses() {
		Pageable pageable = PageRequest.of(0, 10);
		Notification notification = new Notification();
		notification.setId(1L);
		notification.setRecipient(mockAccount);
		notification.setTitle("Yêu cầu mượn sách mới");
		notification.setContent("Độc giả vừa gửi yêu cầu mượn sách");
		notification.setType(NotificationType.BORROW_REQUEST);
		notification.setIsRead(false);
		notification.setCreatedAt(LocalDateTime.now());

		Page<Notification> page = new PageImpl<>(List.of(notification), pageable, 1);
		when(notificationRepository.findByRecipient_IdOrderByIdDesc(10L, pageable)).thenReturn(page);

		Page<NotificationResponse> result = notificationService.getNotifications("staff@library.com", pageable);

		assertNotNull(result);
		assertEquals(1, result.getTotalElements());
		assertEquals("Yêu cầu mượn sách mới", result.getContent().get(0).getTitle());
		assertFalse(result.getContent().get(0).getIsRead());
	}

	@Test
	void getUnreadCount_ShouldReturnCorrectCount() {
		when(notificationRepository.countByRecipient_IdAndIsReadFalse(10L)).thenReturn(5L);

		long count = notificationService.getUnreadCount("staff@library.com");

		assertEquals(5L, count);
		verify(notificationRepository).countByRecipient_IdAndIsReadFalse(10L);
	}

	@Test
	void markAsRead_ShouldUpdateIsReadToTrue() {
		Notification notification = new Notification();
		notification.setId(1L);
		notification.setRecipient(mockAccount);
		notification.setTitle("Thông báo");
		notification.setContent("Nội dung");
		notification.setType(NotificationType.BORROW_REQUEST);
		notification.setIsRead(false);

		when(notificationRepository.findByIdAndRecipient_Id(1L, 10L)).thenReturn(Optional.of(notification));
		when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> i.getArgument(0));

		NotificationResponse response = notificationService.markAsRead("staff@library.com", 1L);

		assertNotNull(response);
		assertTrue(response.getIsRead());
		verify(notificationRepository).save(notification);
	}

	@Test
	void markAllAsRead_ShouldCallRepositoryMarkAllAsRead() {
		when(notificationRepository.markAllAsRead(10L)).thenReturn(3);

		int updated = notificationService.markAllAsRead("staff@library.com");

		assertEquals(3, updated);
		verify(notificationRepository).markAllAsRead(10L);
	}

	@Test
	void registerDeviceToken_ShouldSaveToken() {
		DeviceTokenRequest request = new DeviceTokenRequest("fcm-test-token-123", "ANDROID", "device-id-abc");
		when(deviceTokenRepository.findByToken("fcm-test-token-123")).thenReturn(Optional.empty());

		notificationService.registerDeviceToken("staff@library.com", request);

		verify(deviceTokenRepository).save(any(DeviceToken.class));
	}

	@Test
	void unregisterDeviceToken_ShouldDeleteToken() {
		notificationService.unregisterDeviceToken("staff@library.com", "fcm-test-token-123");

		verify(deviceTokenRepository).deleteByAccount_IdAndToken(10L, "fcm-test-token-123");
	}

	@Test
	void createBorrowRequestNotifications_ShouldCreateNotificationsForRecipients() {
		Account staff1 = new Account();
		staff1.setId(10L);
		staff1.setEmail("staff1@library.com");

		Account staff2 = new Account();
		staff2.setId(20L);
		staff2.setEmail("staff2@library.com");

		when(notificationRepository.existsByRecipient_IdAndReferenceTypeAndReferenceCode(
				eq(10L), eq("BORROW_BATCH"), eq("REQ-123"))).thenReturn(false);
		when(notificationRepository.existsByRecipient_IdAndReferenceTypeAndReferenceCode(
				eq(20L), eq("BORROW_BATCH"), eq("REQ-123"))).thenReturn(false);

		when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> {
			Notification n = i.getArgument(0);
			n.setId(99L);
			return n;
		});

		List<Notification> result = notificationService.createBorrowRequestNotifications(
				List.of(staff1, staff2),
				"REQ-123",
				"Nguyen Van A",
				List.of("Clean Code", "Design Patterns"),
				1L);

		assertEquals(2, result.size());
		assertEquals("Yêu cầu mượn sách mới", result.get(0).getTitle());
		assertTrue(result.get(0).getContent().contains("Nguyen Van A"));
		assertTrue(result.get(0).getContent().contains("2 cuốn sách"));
	}

	@Test
	void createReturnRequestNotifications_ShouldSaveNotificationsForRecipients() {
		Account staff = new Account();
		staff.setId(15L);
		staff.setEmail("staff_return@library.com");

		when(notificationRepository.existsByRecipient_IdAndReferenceTypeAndReferenceCode(
				eq(15L), eq("RETURN_RECORD"), eq("RETURN-REC-101"))).thenReturn(false);

		when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> {
			Notification n = i.getArgument(0);
			n.setId(88L);
			return n;
		});

		List<Notification> result = notificationService.createReturnRequestNotifications(
				List.of(staff),
				101L,
				"Trần Thị B",
				"Lập trình Java cơ bản");

		assertEquals(1, result.size());
		Notification notif = result.get(0);
		assertEquals("Yêu cầu trả sách mới", notif.getTitle());
		assertEquals(NotificationType.RETURN_REQUEST, notif.getType());
		assertEquals(101L, notif.getReferenceId());
		assertEquals("RETURN_RECORD", notif.getReferenceType());
		assertEquals("RETURN-REC-101", notif.getReferenceCode());
		assertTrue(notif.getContent().contains("Trần Thị B"));
		assertTrue(notif.getContent().contains("Lập trình Java cơ bản"));
		assertFalse(notif.getIsRead());
	}

	@Test
	void createReturnRequestNotifications_ShouldSkipIfAlreadyExists() {
		Account staff = new Account();
		staff.setId(15L);

		when(notificationRepository.existsByRecipient_IdAndReferenceTypeAndReferenceCode(
				eq(15L), eq("RETURN_RECORD"), eq("RETURN-REC-101"))).thenReturn(true);

		List<Notification> result = notificationService.createReturnRequestNotifications(
				List.of(staff),
				101L,
				"Trần Thị B",
				"Lập trình Java cơ bản");

		assertEquals(0, result.size());
	}
}
