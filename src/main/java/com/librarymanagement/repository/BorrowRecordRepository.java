package com.librarymanagement.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.librarymanagement.entity.BorrowRecord;
import com.librarymanagement.entity.BorrowStatus;

import jakarta.persistence.LockModeType;

public interface BorrowRecordRepository extends JpaRepository<BorrowRecord, Long> {

	boolean existsByMember_IdAndStatus(Long memberId, //
			BorrowStatus status//
	);

	List<BorrowRecord> findByMember_Id(Long member_Id);

	List<BorrowRecord> findByMember_IdOrderByIdDesc(Long memberId);

	List<BorrowRecord> findAllByOrderByIdDesc();

	// Khóa dòng pessimistic write trên phiếu mượn để ngăn chặn duyệt hoặc xác nhận trả trùng lặp đồng thời
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT r FROM BorrowRecord r WHERE r.id = :id")
	Optional<BorrowRecord> findByIdForUpdate(@Param("id") Long id);
}
