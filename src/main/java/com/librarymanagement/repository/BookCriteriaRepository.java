package com.librarymanagement.repository;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;

import com.librarymanagement.entity.Book;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Order;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;

@Repository
public class BookCriteriaRepository {

	@PersistenceContext
	private EntityManager entityManager;

	public Page<Book> search(String title, //
			String isbn, //
			int page, //
			int size, //
			String sortBy, //
			String direction, //
			String sortBy2, //
			String direction2) {//

		CriteriaBuilder criteriaBuilder = //
				entityManager.getCriteriaBuilder();

		// =========================
		// 1. QUERY LAY DANH SACH SACH
		// =========================

		CriteriaQuery<Book> criteriaQuery = //
				criteriaBuilder.createQuery(Book.class);

		Root<Book> root = //
				criteriaQuery.from(Book.class);

		List<Predicate> predicates = //
				new ArrayList<>();

		if (title != null && !title.isBlank()) {

			Predicate titlePredicate = //
					criteriaBuilder.like(//
							criteriaBuilder.lower(//
									root.get("title")), //
							"%" + title.toLowerCase() + "%"//
					);

			predicates.add(titlePredicate);
		}

		if (isbn != null && !isbn.isBlank()) {

			Predicate isbnPredicate = //
					criteriaBuilder.equal(//
							root.get("isbn"), //
							isbn//
					);

			predicates.add(isbnPredicate);
		}

		criteriaQuery.where(//
				predicates.toArray(new Predicate[0])//
		);

		// =========================
		// 2. SORT
		// =========================

		List<String> allowedSortFields = //
				List.of(//
						"title", //
						"isbn", //
						"quantity", //
						"publishedDate"//
				);

		if (!allowedSortFields.contains(sortBy)) {
			sortBy = "title";
		}

		if (!allowedSortFields.contains(sortBy2)) {
			sortBy2 = "publishedDate";
		}

		Order order1 = //
				"desc".equalsIgnoreCase(direction) //
						? criteriaBuilder.desc(//
								root.get(sortBy)) //
						: criteriaBuilder.asc(//
								root.get(sortBy));

		Order order2 = //
				"desc".equalsIgnoreCase(direction2) //
						? criteriaBuilder.desc(//
								root.get(sortBy2)) //
						: criteriaBuilder.asc(//
								root.get(sortBy2));

		criteriaQuery.orderBy(order1, order2);

		// =========================
		// 3. PHAN TRANG
		// =========================

		TypedQuery<Book> query = //
				entityManager.createQuery(criteriaQuery);

		query.setFirstResult(page * size);

		query.setMaxResults(size);

		List<Book> books = //
				query.getResultList();

		// =========================
		// 4. COUNT QUERY
		// DEM TONG SO SACH
		// =========================

		CriteriaQuery<Long> countQuery = //
				criteriaBuilder.createQuery(Long.class);

		Root<Book> countRoot = //
				countQuery.from(Book.class);

		List<Predicate> countPredicates = //
				new ArrayList<>();

		if (title != null && !title.isBlank()) {

			Predicate titlePredicate = //
					criteriaBuilder.like(//
							criteriaBuilder.lower(//
									countRoot.get("title")), //
							"%" + title.toLowerCase() + "%"//
					);

			countPredicates.add(titlePredicate);
		}

		if (isbn != null && !isbn.isBlank()) {

			Predicate isbnPredicate = //
					criteriaBuilder.equal(//
							countRoot.get("isbn"), //
							isbn//
					);

			countPredicates.add(isbnPredicate);
		}

		countQuery.select(//
				criteriaBuilder.count(countRoot)//
		);

		countQuery.where(//
				countPredicates.toArray(//
						new Predicate[0])//
		);

		Long total = //
				entityManager//
						.createQuery(countQuery)//
						.getSingleResult();

		// =========================
		// 5. TRA VE PAGE
		// =========================

		return new PageImpl<>(//
				books, //
				PageRequest.of(page, size), //
				total//
		);
	}
}