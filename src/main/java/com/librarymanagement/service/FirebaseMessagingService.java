package com.librarymanagement.service;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.BatchResponse;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.MulticastMessage;
import com.google.firebase.messaging.Notification;
import com.google.firebase.messaging.SendResponse;
import com.librarymanagement.entity.DeviceToken;
import com.librarymanagement.event.BorrowRequestedEvent;
import com.librarymanagement.event.BorrowApprovedEvent;
import com.librarymanagement.event.ReturnRequestedEvent;
import com.librarymanagement.repository.DeviceTokenRepository;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class FirebaseMessagingService {

	private final DeviceTokenRepository deviceTokenRepository;

	@Value("${app.firebase.enabled:false}")
	private boolean firebaseEnabled;

	@Value("${app.firebase.config-path:firebase-service-account.json}")
	private String configPath;

	private boolean initialized = false;

	@PostConstruct
	public void init() {
		if (!firebaseEnabled) {
			log.info("Firebase Cloud Messaging (FCM) is disabled by configuration (app.firebase.enabled=false).");
			return;
		}

		try {
			if (!FirebaseApp.getApps().isEmpty()) {
				log.info("FirebaseApp is already initialized for project: {}",
						FirebaseApp.getInstance().getOptions().getProjectId());
				initialized = true;
				return;
			}

			GoogleCredentials credentials = null;

			// 1. Thử nạp qua Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS)
			try {
				credentials = GoogleCredentials.getApplicationDefault();
				log.info("Loaded Firebase credentials via Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS).");
			} catch (Exception e) {
				log.debug("ApplicationDefaultCredentials not available in current environment: {}", e.getMessage());
			}

			// 2. Fallback nếu biến môi trường chưa nạp được vào process hiện tại
			if (credentials == null) {
				InputStream serviceAccountStream = null;

				if (configPath != null && !configPath.trim().isEmpty()) {
					File file = new File(configPath);
					if (file.exists()) {
						serviceAccountStream = new FileInputStream(file);
					} else {
						ClassPathResource resource = new ClassPathResource(configPath);
						if (resource.exists()) {
							serviceAccountStream = resource.getInputStream();
						}
					}
				}

				if (serviceAccountStream == null) {
					String userHome = System.getProperty("user.home");
					File defaultConfigFile = new File(userHome, ".config/library-management/firebase-admin.json");
					if (defaultConfigFile.exists()) {
						serviceAccountStream = new FileInputStream(defaultConfigFile);
						log.info("Loaded Firebase credentials from default user config path: ~/.config/library-management/firebase-admin.json");
					}
				}

				if (serviceAccountStream != null) {
					try (InputStream is = serviceAccountStream) {
						credentials = GoogleCredentials.fromStream(is);
					}
				}
			}

			if (credentials == null) {
				log.warn("Firebase credentials not found (checked GOOGLE_APPLICATION_CREDENTIALS and config path). FCM push notifications will remain inactive.");
				initialized = false;
				return;
			}

			String projectId = null;
			if (credentials instanceof ServiceAccountCredentials) {
				ServiceAccountCredentials sac = (ServiceAccountCredentials) credentials;
				projectId = sac.getProjectId();
			}

			FirebaseOptions.Builder optionsBuilder = FirebaseOptions.builder()
					.setCredentials(credentials);

			if (projectId != null && !projectId.trim().isEmpty()) {
				optionsBuilder.setProjectId(projectId);
			}

			FirebaseApp.initializeApp(optionsBuilder.build());
			initialized = true;
			log.info("Firebase Admin SDK initialized successfully for project ID: {}",
					FirebaseApp.getInstance().getOptions().getProjectId());
		} catch (Exception e) {
			log.error("Failed to initialize Firebase Admin SDK: {}. Mobile push will be bypassed gracefully.", e.getMessage());
			initialized = false;
		}
	}

	public void sendPushNotification(BorrowRequestedEvent event) {
		if (!firebaseEnabled || !initialized) {
			return;
		}

		try {
			List<DeviceToken> deviceTokens = deviceTokenRepository.findByAccount_IdIn(event.getRecipientAccountIds());
			if (deviceTokens == null || deviceTokens.isEmpty()) {
				log.debug("No active device tokens found for recipient accounts: {}", event.getRecipientAccountIds());
				return;
			}

			List<String> tokens = deviceTokens.stream()
					.map(DeviceToken::getToken)
					.distinct()
					.toList();

			String title = "Yêu cầu mượn sách mới";
			String body;
			if (event.getBookTitles().size() == 1) {
				body = String.format("Độc giả %s vừa gửi yêu cầu mượn sách: \"%s\".",
						event.getMemberFullName(), event.getBookTitles().get(0));
			} else {
				body = String.format("Độc giả %s vừa gửi yêu cầu mượn %d cuốn sách.",
						event.getMemberFullName(), event.getTotalBooks());
			}

			MulticastMessage message = MulticastMessage.builder()
					.addAllTokens(tokens)
					.setNotification(Notification.builder()
							.setTitle(title)
							.setBody(body)
							.build())
					.putData("type", "BORROW_REQUEST")
					.putData("screen", "BorrowManageTab")
					.putData("batchCode", event.getBatchCode() != null ? event.getBatchCode() : "")
					.build();

			BatchResponse response = FirebaseMessaging.getInstance().sendEachForMulticast(message);
			log.info("Sent FCM push: {} success, {} failure", response.getSuccessCount(), response.getFailureCount());

			purgeInvalidTokens(response, tokens);
		} catch (Exception e) {
			log.warn("Error sending Firebase Push Notification: {}", e.getMessage());
		}
	}

	public void sendReturnPushNotification(ReturnRequestedEvent event) {
		if (!firebaseEnabled || !initialized) {
			return;
		}

		try {
			List<DeviceToken> deviceTokens = deviceTokenRepository.findByAccount_IdIn(event.getRecipientAccountIds());
			if (deviceTokens == null || deviceTokens.isEmpty()) {
				log.debug("No active device tokens found for return recipient accounts: {}", event.getRecipientAccountIds());
				return;
			}

			List<String> tokens = deviceTokens.stream()
					.map(DeviceToken::getToken)
					.distinct()
					.toList();

			String title = "Yêu cầu trả sách mới";
			String body = String.format("Độc giả %s vừa gửi yêu cầu trả sách: \"%s\".",
					event.getMemberFullName(), event.getBookTitle());

			MulticastMessage message = MulticastMessage.builder()
					.addAllTokens(tokens)
					.setNotification(Notification.builder()
							.setTitle(title)
							.setBody(body)
							.build())
					.putData("type", "RETURN_REQUEST")
					.putData("screen", "BorrowManageTab")
					.putData("status", "RETURN_PENDING")
					.putData("borrowRecordId", String.valueOf(event.getBorrowRecordId()))
					.build();

			BatchResponse response = FirebaseMessaging.getInstance().sendEachForMulticast(message);
			log.info("Sent FCM return push: {} success, {} failure", response.getSuccessCount(), response.getFailureCount());

			purgeInvalidTokens(response, tokens);
		} catch (Exception e) {
			log.warn("Error sending Firebase Return Push Notification: {}", e.getMessage());
		}
	}

	public void sendBorrowApprovedPushNotification(BorrowApprovedEvent event) {
		if (!firebaseEnabled || !initialized) {
			return;
		}

		try {
			List<DeviceToken> deviceTokens = deviceTokenRepository.findByAccount_Id(event.getBorrowerAccountId());
			if (deviceTokens == null || deviceTokens.isEmpty()) {
				log.debug("No active device tokens found for borrower account: {}", event.getBorrowerAccountId());
				return;
			}

			List<String> tokens = deviceTokens.stream()
					.map(DeviceToken::getToken)
					.distinct()
					.toList();

			MulticastMessage message = MulticastMessage.builder()
					.addAllTokens(tokens)
					.setNotification(Notification.builder()
							.setTitle(event.getTitle())
							.setBody(event.getContent())
							.build())
					.putData("type", "BORROW_APPROVED")
					.putData("screen", "MyBooksTab")
					.putData("borrowRecordId", String.valueOf(event.getBorrowRecordId()))
					.putData("bookId", event.getBookId() != null ? String.valueOf(event.getBookId()) : "")
					.putData("bookTitle", event.getBookTitle() != null ? event.getBookTitle() : "")
					.putData("dueDate", event.getFormattedDueDate() != null ? event.getFormattedDueDate() : "")
					.build();

			BatchResponse response = FirebaseMessaging.getInstance().sendEachForMulticast(message);
			log.info("Sent FCM borrow approved push: {} success, {} failure", response.getSuccessCount(), response.getFailureCount());

			purgeInvalidTokens(response, tokens);
		} catch (Exception e) {
			log.warn("Error sending Firebase Borrow Approved Push Notification: {}", e.getMessage());
		}
	}

	private void purgeInvalidTokens(BatchResponse response, List<String> tokens) {
		if (response.getFailureCount() > 0) {
			List<String> invalidTokens = new ArrayList<>();
			List<SendResponse> responses = response.getResponses();
			for (int i = 0; i < responses.size(); i++) {
				if (!responses.get(i).isSuccessful()) {
					String errorCode = responses.get(i).getException().getMessagingErrorCode() != null
							? responses.get(i).getException().getMessagingErrorCode().name()
							: "UNKNOWN";
					if ("UNREGISTERED".equalsIgnoreCase(errorCode) || "INVALID_ARGUMENT".equalsIgnoreCase(errorCode)) {
						invalidTokens.add(tokens.get(i));
					}
				}
			}
			for (String invalidToken : invalidTokens) {
				deviceTokenRepository.deleteByToken(invalidToken);
				log.info("Purged unregistered FCM device token: {}", invalidToken);
			}
		}
	}
}
