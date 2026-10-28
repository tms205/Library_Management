package com.librarymanagement.repository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;

import com.librarymanagement.entity.Author;
import com.librarymanagement.entity.Book;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Order;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;

@Repository
public class BookCriteriaRepository {

	@PersistenceContext
	private EntityManager entityManager;

	public Page<Book> search(
			String title,
			String isbn,
			String author,
			Boolean inStock,
			LocalDate fromDate,
			LocalDate toDate,
			int page,
			int size,
			String sortBy,
			String direction,
			String sortBy2,
			String direction2) {

		CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();

		// =========================================================================
		// 1. QUERY LẤY DANH SÁCH SÁCH (Dùng CriteriaBuilder để ghép điều kiện động)
		// Chỉ khi nào người dùng có nhập/chọn bộ lọc thì mới add Predicate vào list
		// =========================================================================
		CriteriaQuery<Book> criteriaQuery = criteriaBuilder.createQuery(Book.class);
		Root<Book> root = criteriaQuery.from(Book.class);
		List<Predicate> predicates = new ArrayList<>();

		// 1.1 Tìm kiếm theo tên sách: hạ về chữ thường để tìm không phân biệt hoa/thường
		if (title != null && !title.isBlank()) {
			Predicate titlePredicate = criteriaBuilder.like(
					criteriaBuilder.lower(root.get("title")),
					"%" + title.toLowerCase().trim() + "%");
			predicates.add(titlePredicate);
		}

		// 1.2 Tìm theo ISBN: dùng LIKE để người dùng gõ vài số cuối hoặc bỏ dấu gạch nối vẫn ra sách
		if (isbn != null && !isbn.isBlank()) {
			Predicate isbnPredicate = criteriaBuilder.like(
					criteriaBuilder.lower(root.get("isbn")),
					"%" + isbn.toLowerCase().trim() + "%");
			predicates.add(isbnPredicate);
		}

		// 1.3 Tìm theo tên tác giả: phải LEFT JOIN qua bảng quan hệ n-n (authors)
		// LƯU Ý: bắt buộc phải có criteriaQuery.distinct(true) vì 1 cuốn sách có thể có
		// nhiều tác giả trùng từ khóa tìm kiếm, nếu không distinct sẽ bị nhân bản dòng!
		if (author != null && !author.isBlank()) {
			Join<Book, Author> authorJoin = root.join("authors", JoinType.LEFT);
			Predicate authorPredicate = criteriaBuilder.like(
					criteriaBuilder.lower(authorJoin.get("name")),
					"%" + author.toLowerCase().trim() + "%");
			predicates.add(authorPredicate);
			criteriaQuery.distinct(true);
		}

		// 1.4 Lọc theo trạng thái kho: inStock = true (quantity > 0), false (quantity == 0)
		if (inStock != null) {
			if (inStock) {
				predicates.add(criteriaBuilder.greaterThan(root.get("quantity"), 0));
			} else {
				predicates.add(criteriaBuilder.equal(root.get("quantity"), 0));
			}
		}

		// 1.5 Lọc theo khoảng ngày xuất bản (từ ngày... đến ngày...)
		if (fromDate != null) {
			predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("publishedDate"), fromDate));
		}

		if (toDate != null) {
			predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("publishedDate"), toDate));
		}

		criteriaQuery.where(predicates.toArray(new Predicate[0]));

		// =========================================================================
		// 2. SẮP XẾP (SORTING)
		// Whitelist các trường được phép sort để tránh người dùng truyền trường bậy gây lỗi SQL
		// =========================================================================
		List<String> allowedSortFields = List.of(
				"id",
				"title",
				"isbn",
				"quantity",
				"publishedDate");

		if (!allowedSortFields.contains(sortBy)) {
			sortBy = "title";
		}

		if (!allowedSortFields.contains(sortBy2)) {
			sortBy2 = "publishedDate";
		}

		Order order1 = "desc".equalsIgnoreCase(direction)
				? criteriaBuilder.desc(root.get(sortBy))
				: criteriaBuilder.asc(root.get(sortBy));

		Order order2 = "desc".equalsIgnoreCase(direction2)
				? criteriaBuilder.desc(root.get(sortBy2))
				: criteriaBuilder.asc(root.get(sortBy2));

		criteriaQuery.orderBy(order1, order2);

		// =========================
		// 3. PHAN TRANG
		// =========================
		TypedQuery<Book> query = entityManager.createQuery(criteriaQuery);
		query.setFirstResult(page * size);
		query.setMaxResults(size);

		List<Book> books = query.getResultList();

		// =========================================================================
		// 4. COUNT QUERY (Tính tổng số kết quả khớp để Spring Data phân trang)
		// Lưu ý: Nếu có lọc theo tác giả (JOIN) thì phải dùng countDistinct để tránh đếm trùng 1 sách nhiều lần!
		// =========================================================================
		CriteriaQuery<Long> countQuery = criteriaBuilder.createQuery(Long.class);
		Root<Book> countRoot = countQuery.from(Book.class);
		List<Predicate> countPredicates = new ArrayList<>();

		if (title != null && !title.isBlank()) {
			countPredicates.add(criteriaBuilder.like(
					criteriaBuilder.lower(countRoot.get("title")),
					"%" + title.toLowerCase().trim() + "%"));
		}

		if (isbn != null && !isbn.isBlank()) {
			countPredicates.add(criteriaBuilder.like(
					criteriaBuilder.lower(countRoot.get("isbn")),
					"%" + isbn.toLowerCase().trim() + "%"));
		}

		if (author != null && !author.isBlank()) {
			Join<Book, Author> countAuthorJoin = countRoot.join("authors", JoinType.LEFT);
			countPredicates.add(criteriaBuilder.like(
					criteriaBuilder.lower(countAuthorJoin.get("name")),
					"%" + author.toLowerCase().trim() + "%"));
			countQuery.select(criteriaBuilder.countDistinct(countRoot));
		} else {
			countQuery.select(criteriaBuilder.count(countRoot));
		}

		if (inStock != null) {
			if (inStock) {
				countPredicates.add(criteriaBuilder.greaterThan(countRoot.get("quantity"), 0));
			} else {
				countPredicates.add(criteriaBuilder.equal(countRoot.get("quantity"), 0));
			}
		}

		if (fromDate != null) {
			countPredicates.add(criteriaBuilder.greaterThanOrEqualTo(countRoot.get("publishedDate"), fromDate));
		}

		if (toDate != null) {
			countPredicates.add(criteriaBuilder.lessThanOrEqualTo(countRoot.get("publishedDate"), toDate));
		}

		countQuery.where(countPredicates.toArray(new Predicate[0]));

		Long total = entityManager.createQuery(countQuery).getSingleResult();

		// =========================
		// 5. TRA VE PAGE
		// =========================
		return new PageImpl<>(
				books,
				PageRequest.of(page, size),
				total);
	}

	// Overloaded method for backward compatibility
	public Page<Book> search(
			String title,
			String isbn,
			int page,
			int size,
			String sortBy,
			String direction,
			String sortBy2,
			String direction2) {
		return search(title, isbn, null, null, null, null, page, size, sortBy, direction, sortBy2, direction2);
	}
}