package com.librarymanagement.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.librarymanagement.entity.BorrowRecord;
import com.librarymanagement.entity.BorrowStatus;

public interface BorrowRecordRepository extends JpaRepository<BorrowRecord, Long> {

	boolean existsByMember_IdAndStatus(Long memberId, //
			BorrowStatus status//
	);

	List<BorrowRecord> findByMember_Id(Long member_Id);
}
