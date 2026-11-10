package com.librarymanagement.listener;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.librarymanagement.event.BorrowRequestedEvent;
import com.librarymanagement.event.BorrowApprovedEvent;
import com.librarymanagement.event.ReturnRequestedEvent;
import com.librarymanagement.event.BookInventoryChangedEvent;
import com.librarymanagement.service.FirebaseMessagingService;
import com.librarymanagement.service.SseNotificationService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class BorrowNotificationListener {

	private final SseNotificationService sseNotificationService;
	private final FirebaseMessagingService firebaseMessagingService;

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void handleBorrowNotification(BorrowRequestedEvent event) {
		log.info("Processing AFTER_COMMIT BorrowRequestedEvent: batchCode={}, books={}",
				event.getBatchCode(), event.getTotalBooks());

		// 1. Chuẩn bị payload thông báo thời gian thực
		Map<String, Object> ssePayload = Map.of(
				"type", "BORROW_REQUEST",
				"batchCode", event.getBatchCode(),
				"memberId", event.getMemberId(),
				"memberName", event.getMemberFullName(),
				"totalBooks", event.getTotalBooks(),
				"bookTitles", event.getBookTitles(),
				"createdAt", event.getCreatedAt().toString()
		);

		// 2. Phát SSE tới các trình duyệt Web đang mở của Admin/Staff
		try {
			sseNotificationService.sendToAccounts(event.getRecipientAccountIds(), ssePayload);
		} catch (Exception e) {
			log.warn("Error broadcasting SSE for borrow event: {}", e.getMessage());
		}

		// 3. Gửi Push Notification tới thiết bị Mobile qua Firebase Admin SDK
		try {
			firebaseMessagingService.sendPushNotification(event);
		} catch (Exception e) {
			log.warn("Error sending Firebase Push for borrow event: {}", e.getMessage());
		}
	}

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void handleBorrowApprovedNotification(BorrowApprovedEvent event) {
		log.info("Processing AFTER_COMMIT BorrowApprovedEvent: recordId={}, book={}, recipientAccountId={}",
				event.getBorrowRecordId(), event.getBookTitle(), event.getBorrowerAccountId());

		// 1. Chuẩn bị payload thông báo thời gian thực gửi qua SSE đến Web của Độc giả
		Map<String, Object> ssePayload = new LinkedHashMap<>();
		ssePayload.put("id", event.getNotificationId() != null ? event.getNotificationId() : 0L);
		ssePayload.put("type", "BORROW_APPROVED");
		ssePayload.put("title", event.getTitle());
		ssePayload.put("content", event.getContent());
		ssePayload.put("borrowRecordId", event.getBorrowRecordId());
		ssePayload.put("bookId", event.getBookId() != null ? event.getBookId() : 0L);
		ssePayload.put("bookTitle", event.getBookTitle());
		ssePayload.put("borrowerAccountId", event.getBorrowerAccountId());
		ssePayload.put("dueDate", event.getDueDate() != null ? event.getDueDate().toString() : "");
		ssePayload.put("formattedDueDate", event.getFormattedDueDate());
		ssePayload.put("isRead", false);
		ssePayload.put("createdAt", event.getCreatedAt().toString());

		// 2. Phát SSE tới chính độc giả đã yêu cầu mượn
		try {
			sseNotificationService.sendToAccounts(List.of(event.getBorrowerAccountId()), ssePayload);
		} catch (Exception e) {
			log.warn("Error broadcasting SSE for borrow approved event: {}", e.getMessage());
		}

		// 3. Gửi Push Notification tới thiết bị Mobile của độc giả qua Firebase Admin SDK
		try {
			firebaseMessagingService.sendBorrowApprovedPushNotification(event);
		} catch (Exception e) {
			log.warn("Error sending Firebase Push for borrow approved event: {}", e.getMessage());
		}
	}

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void handleReturnNotification(ReturnRequestedEvent event) {
		log.info("Processing AFTER_COMMIT ReturnRequestedEvent: recordId={}, book={}",
				event.getBorrowRecordId(), event.getBookTitle());

		// 1. Chuẩn bị payload thông báo thời gian thực
		Map<String, Object> ssePayload = Map.of(
				"type", "RETURN_REQUEST",
				"borrowRecordId", event.getBorrowRecordId(),
				"memberId", event.getMemberId(),
				"memberName", event.getMemberFullName(),
				"bookId", event.getBookId() != null ? event.getBookId() : 0L,
				"bookTitle", event.getBookTitle(),
				"createdAt", event.getCreatedAt().toString()
		);

		// 2. Phát SSE tới các trình duyệt Web đang mở của Admin/Staff có quyền RETURN_CONFIRM
		try {
			sseNotificationService.sendToAccounts(event.getRecipientAccountIds(), ssePayload);
		} catch (Exception e) {
			log.warn("Error broadcasting SSE for return event: {}", e.getMessage());
		}

		// 3. Gửi Push Notification tới thiết bị Mobile qua Firebase Admin SDK
		try {
			firebaseMessagingService.sendReturnPushNotification(event);
		} catch (Exception e) {
			log.warn("Error sending Firebase Push for return event: {}", e.getMessage());
		}
	}

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void handleInventoryChangedNotification(BookInventoryChangedEvent event) {
		log.info("Processing AFTER_COMMIT BookInventoryChangedEvent: bookId={}, title={}, quantity={}",
				event.getBookId(), event.getTitle(), event.getQuantity());

		if (event.getRecipientAccountIds() == null || event.getRecipientAccountIds().isEmpty()) {
			return;
		}

		Map<String, Object> ssePayload = Map.of(
				"type", "BOOK_INVENTORY_CHANGED",
				"bookId", event.getBookId(),
				"title", event.getTitle(),
				"quantity", event.getQuantity()
		);

		try {
			// Chỉ gửi tới các tài khoản có quyền BOOK_VIEW
			sseNotificationService.sendToAccounts(event.getRecipientAccountIds(), ssePayload);
		} catch (Exception e) {
			log.warn("Error broadcasting inventory change SSE: {}", e.getMessage());
		}
	}
}
