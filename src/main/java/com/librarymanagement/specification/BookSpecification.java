package com.librarymanagement.specification;

import org.springframework.data.jpa.domain.Specification;

import com.librarymanagement.entity.Book;

public class BookSpecification {
	// điều kiện query cho 1 book
	public static Specification<Book> hasTitle(String title) {
		// root = book, query chưa đụng tới,
		return (root, query, criteriaBuilder) -> {
			// Nếu user không nhập title thì đừng tạo điều kiện title.
			if (title == null || title.isBlank()) {
				return criteriaBuilder.conjunction();
			}
			return criteriaBuilder.like(//
					criteriaBuilder.lower(root.get("title")), //
					"%" + title.toLowerCase() + "%");
		};
	}

	public static Specification<Book> hasIsbn(String isbn) {
		return (root, query, criteriaBuiler) -> {

			if (isbn == null || isbn.isBlank()) {
				return criteriaBuiler.conjunction();
			}
			// WHERE isbn = '12345678' tương đương với lệnh dưới
			// isbn là International Standard Book Number (Mã số tiêu chuẩn quốc tế cho
			// sách).
			return criteriaBuiler.equal(root.get("isbn"), //
					isbn);//

		};
	}

}
