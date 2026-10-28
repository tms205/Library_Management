package com.librarymanagement.repository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Repository;

import com.librarymanagement.entity.Book;
import com.librarymanagement.entity.BorrowRecord;
import com.librarymanagement.entity.BorrowStatus;
import com.librarymanagement.entity.Member;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;

@Repository
public class BorrowCriteriaRepository {

	@PersistenceContext
	private EntityManager entityManager;

	/**
	 * Tìm kiếm động phiếu mượn/trả sách bằng JPA Criteria API
	 * Hỗ trợ lọc theo: Tên độc giả, Tên sách, Ngày mượn/trả (ngày cụ thể hoặc khoảng từ ngày - đến ngày), và Trạng thái
	 */
	public List<BorrowRecord> search(
			String memberName,
			String bookTitle,
			LocalDate fromDate,
			LocalDate toDate,
			LocalDate date,
			BorrowStatus status) {

		CriteriaBuilder cb = entityManager.getCriteriaBuilder();
		CriteriaQuery<BorrowRecord> query = cb.createQuery(BorrowRecord.class);
		Root<BorrowRecord> root = query.from(BorrowRecord.class);

		// Join sang bảng Member và Book để lấy thông tin tìm kiếm
		Join<BorrowRecord, Member> memberJoin = root.join("member", JoinType.LEFT);
		Join<BorrowRecord, Book> bookJoin = root.join("book", JoinType.LEFT);

		List<Predicate> predicates = new ArrayList<>();

		// 1. Tìm theo tên độc giả: tìm gần đúng (LIKE) và không phân biệt hoa/thường
		if (memberName != null && !memberName.isBlank()) {
			predicates.add(cb.like(
					cb.lower(memberJoin.get("fullName")),
					"%" + memberName.toLowerCase().trim() + "%"
			));
		}

		// 2. Tìm theo tên sách: tìm gần đúng (LIKE) và không phân biệt hoa/thường
		if (bookTitle != null && !bookTitle.isBlank()) {
			predicates.add(cb.like(
					cb.lower(bookJoin.get("title")),
					"%" + bookTitle.toLowerCase().trim() + "%"
			));
		}

		// 3. Tìm theo một ngày cụ thể (khớp với ngày mượn hoặc ngày trả)
		if (date != null) {
			Predicate matchBorrowDate = cb.equal(root.get("borrowDate"), date);
			Predicate matchReturnDate = cb.equal(root.get("returnDate"), date);
			predicates.add(cb.or(matchBorrowDate, matchReturnDate));
		}

		// 4. Lọc theo khoảng ngày (từ ngày... đến ngày...)
		// Áp dụng cho cả ngày mượn và ngày trả để tìm mọi giao dịch phát sinh trong khoảng thời gian này
		if (fromDate != null) {
			Predicate fromBorrow = cb.greaterThanOrEqualTo(root.get("borrowDate"), fromDate);
			Predicate fromReturn = cb.greaterThanOrEqualTo(root.get("returnDate"), fromDate);
			predicates.add(cb.or(fromBorrow, fromReturn));
		}

		if (toDate != null) {
			Predicate toBorrow = cb.lessThanOrEqualTo(root.get("borrowDate"), toDate);
			Predicate toReturn = cb.lessThanOrEqualTo(root.get("returnDate"), toDate);
			predicates.add(cb.or(toBorrow, toReturn));
		}

		// 5. Lọc theo trạng thái phiếu mượn (PENDING, BORROWED, RETURN_PENDING, RETURNED, REJECTED)
		if (status != null) {
			predicates.add(cb.equal(root.get("status"), status));
		}

		if (!predicates.isEmpty()) {
			query.where(predicates.toArray(new Predicate[0]));
		}

		// Mặc định luôn sắp xếp các phiếu mượn mới nhất lên đầu danh sách
		query.orderBy(cb.desc(root.get("id")));

		TypedQuery<BorrowRecord> typedQuery = entityManager.createQuery(query);
		return typedQuery.getResultList();
	}
}
