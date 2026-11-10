package com.librarymanagement.dto.response;

import java.time.LocalDateTime;

import com.librarymanagement.entity.Notification;
import com.librarymanagement.entity.NotificationType;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {

	private Long id;
	private Long recipientAccountId;
	private String title;
	private String content;
	private NotificationType type;
	private Long referenceId;
	private String referenceType;
	private String referenceCode;
	private Boolean isRead;
	private LocalDateTime createdAt;

	public static NotificationResponse fromEntity(Notification entity) {
		return new NotificationResponse(
				entity.getId(),
				entity.getRecipient() != null ? entity.getRecipient().getId() : null,
				entity.getTitle(),
				entity.getContent(),
				entity.getType(),
				entity.getReferenceId(),
				entity.getReferenceType(),
				entity.getReferenceCode(),
				entity.getIsRead(),
				entity.getCreatedAt()
		);
	}
}
