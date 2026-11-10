package com.librarymanagement.event;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class BookInventoryChangedEvent {

	private final Long bookId;
	private final String title;
	private final Integer quantity;
	private final List<Long> recipientAccountIds;
}
