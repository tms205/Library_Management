package com.librarymanagement.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.File;
import java.lang.reflect.Field;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.google.firebase.FirebaseApp;
import com.librarymanagement.event.BorrowRequestedEvent;
import com.librarymanagement.event.ReturnRequestedEvent;
import com.librarymanagement.repository.DeviceTokenRepository;

class FirebaseMessagingServiceTest {

	@Test
	@DisplayName("Should bypass initialization when firebase is disabled")
	void testInitDisabled() throws Exception {
		DeviceTokenRepository repository = mock(DeviceTokenRepository.class);
		FirebaseMessagingService service = new FirebaseMessagingService(repository);

		setField(service, "firebaseEnabled", false);
		setField(service, "configPath", "non-existent.json");

		service.init();

		assertFalse(getField(service, "initialized", Boolean.class));
	}

	@Test
	@DisplayName("Should initialize Firebase Admin SDK when credentials file exists")
	void testInitWithActualCredentials() throws Exception {
		String userHome = System.getProperty("user.home");
		File configFile = new File(userHome, ".config/library-management/firebase-admin.json");

		if (!configFile.exists()) {
			// Skip if not present in environment
			return;
		}

		DeviceTokenRepository repository = mock(DeviceTokenRepository.class);
		FirebaseMessagingService service = new FirebaseMessagingService(repository);

		setField(service, "firebaseEnabled", true);
		setField(service, "configPath", configFile.getAbsolutePath());

		service.init();

		assertTrue(getField(service, "initialized", Boolean.class));
		assertFalse(FirebaseApp.getApps().isEmpty());
		FirebaseApp app = FirebaseApp.getInstance();
		assertNotNull(app);
		assertEquals("library-management-81691", app.getOptions().getProjectId());
	}

	@Test
	@DisplayName("Should safely handle sendPushNotification when no device tokens exist")
	void testSendPushNotificationNoTokens() throws Exception {
		DeviceTokenRepository repository = mock(DeviceTokenRepository.class);
		when(repository.findByAccount_IdIn(List.of(1L))).thenReturn(Collections.emptyList());

		FirebaseMessagingService service = new FirebaseMessagingService(repository);
		setField(service, "firebaseEnabled", true);
		setField(service, "initialized", true);

		BorrowRequestedEvent event = new BorrowRequestedEvent(
				"REQ-TEST-001",
				10L,
				"Nguyễn Văn A",
				List.of("Sách Java"),
				1,
				List.of(100L),
				List.of(1L),
				java.time.LocalDateTime.now()
		);

		// Should not throw any exception
		service.sendPushNotification(event);
	}

	@Test
	@DisplayName("Should safely handle sendReturnPushNotification when no device tokens exist")
	void testSendReturnPushNotificationNoTokens() throws Exception {
		DeviceTokenRepository repository = mock(DeviceTokenRepository.class);
		when(repository.findByAccount_IdIn(List.of(2L))).thenReturn(Collections.emptyList());

		FirebaseMessagingService service = new FirebaseMessagingService(repository);
		setField(service, "firebaseEnabled", true);
		setField(service, "initialized", true);

		ReturnRequestedEvent event = new ReturnRequestedEvent(
				105L,
				10L,
				"Trần Thị B",
				50L,
				"Lập trình Java cơ bản",
				List.of(2L),
				java.time.LocalDateTime.now()
		);

		// Should not throw any exception
		service.sendReturnPushNotification(event);
	}

	private void setField(Object target, String fieldName, Object value) throws Exception {
		Field field = target.getClass().getDeclaredField(fieldName);
		field.setAccessible(true);
		field.set(target, value);
	}

	@SuppressWarnings("unchecked")
	private <T> T getField(Object target, String fieldName, Class<T> clazz) throws Exception {
		Field field = target.getClass().getDeclaredField(fieldName);
		field.setAccessible(true);
		return (T) field.get(target);
	}
}
