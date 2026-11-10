package com.librarymanagement.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.librarymanagement.entity.Notification;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

	Page<Notification> findByRecipient_IdOrderByIdDesc(Long recipientAccountId, Pageable pageable);

	long countByRecipient_IdAndIsReadFalse(Long recipientAccountId);

	Optional<Notification> findByIdAndRecipient_Id(Long id, Long recipientAccountId);

	@Modifying
	@Query("UPDATE Notification n SET n.isRead = true WHERE n.recipient.id = :recipientAccountId AND n.isRead = false")
	int markAllAsRead(@Param("recipientAccountId") Long recipientAccountId);

	boolean existsByRecipient_IdAndReferenceTypeAndReferenceCode(
			Long recipientAccountId,
			String referenceType,
			String referenceCode);
}
