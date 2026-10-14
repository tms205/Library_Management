package com.librarymanagement.repository;

import java.util.ArrayList;
import java.util.List;

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
//criteria dùng để xây query cho từng phần
//criteriabuilder là công cụ xây câu query
//criteriaQuery<book> tức câu query sẽ trả về book
//root<book> đại diện cho bảng/entity
//predicate đại diện cho 1 lệnh where

@Repository
public class BookCriteriaRepository {
	@PersistenceContext
	private EntityManager entityManager;

	public List<Book> search(String title, //
			String isbn, //
			int page, //
			int size, //
			String sortBy, //
			String direction, //
			String sortBy2, //
			String direction2) {//
		CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();

		CriteriaQuery<Book> criteriaQuery = criteriaBuilder.createQuery(Book.class);

		Root<Book> root = criteriaQuery.from(Book.class);

		List<Predicate> predicates = new ArrayList<>();

		if (title != null && !title.isBlank()) {
			Predicate titlePredicate = criteriaBuilder.like(//
					criteriaBuilder.lower(//
							root.get("title")),
					"%" + title.toLowerCase() + "%");
			predicates.add(titlePredicate);
		}

		if (isbn != null && !isbn.isBlank()) {
			Predicate isbnPredicate = criteriaBuilder.equal(//
					root.get("isbn"), //
					isbn);

			predicates.add(isbnPredicate);

		}

		criteriaQuery.where(predicates.toArray(new Predicate[0]));

		// sort cứng
		// criteriaQuery.orderBy(criteriaBuilder.asc(root.get("title")),
		// criteriaBuilder.desc(root.get("publishedDate")));

		// Chỉ cho phép sort theo các field này
		List<String> allowedSortFields = List.of("title", "isbn", "quantity", "publishedDate");
		// không sort theo field thì default cho title
		if (!allowedSortFields.contains(sortBy)) {
			sortBy = "title";
		}

		if (!allowedSortFields.contains(sortBy2)) {
			sortBy2 = "publishedDate";
		}

		// multi condition
		Order order1 = "desc".equalsIgnoreCase(direction) ? criteriaBuilder.desc(root.get(sortBy))
				: criteriaBuilder.asc(root.get(sortBy));

		Order order2 = "desc".equalsIgnoreCase(direction2) ? criteriaBuilder.desc(root.get(sortBy2))
				: criteriaBuilder.asc(root.get(sortBy2));

		criteriaQuery.orderBy(order1, order2);

		criteriaQuery.orderBy(order1, order2);

		TypedQuery<Book> query = entityManager.createQuery(criteriaQuery);

		query.setFirstResult(page * size);

		query.setMaxResults(size);// lấy 10 record kế tiếp

		return query.getResultList();
	}

}
