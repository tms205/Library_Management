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
public class BorrowRequestedEvent {

	private String batchCode;
	private Long memberId;
	private String memberFullName;
	private List<String> bookTitles;
	private int totalBooks;
	private List<Long> borrowRecordIds;
	private List<Long> recipientAccountIds;
	private LocalDateTime createdAt;
}
