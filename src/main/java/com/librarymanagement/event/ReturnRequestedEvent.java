package com.librarymanagement.event;

import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class ReturnRequestedEvent {

	private Long borrowRecordId;
	private Long memberId;
	private String memberFullName;
	private Long bookId;
	private String bookTitle;
	private List<Long> recipientAccountIds;
	private LocalDateTime createdAt;
}
