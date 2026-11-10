package com.librarymanagement.event;

import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class BorrowApprovedEvent {
	private final Long notificationId;
	private final Long borrowRecordId;
	private final Long bookId;
	private final String bookTitle;
	private final Long borrowerAccountId;
	private final LocalDate dueDate;
	private final String formattedDueDate;
	private final String title;
	private final String content;
	private final LocalDateTime createdAt;
}
