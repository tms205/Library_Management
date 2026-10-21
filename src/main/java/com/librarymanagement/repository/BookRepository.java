package com.librarymanagement.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.librarymanagement.entity.Book;

//JpaSpecificationExecutor cung cấp sẵn các hàm:
//findAll(Specification<T> spec),
//findAll(Specification<T> spec, Pageable pageable), ...
public interface BookRepository extends JpaRepository<Book, Long>, JpaSpecificationExecutor<Book> {

	boolean existsByIsbn(String isbn);

	List<Book> findByTitleContainingIgnoreCase(String title);
	// findby tìm theo
	// title : filed title trong book
	// containing: có chứa
	// Ignorecase: không phân biệt hoa thường

	// native query tức spring chạy sql trực tiếp
	@Query(value = "SELECT * FROM books b "//
			+ "WHERE (:title IS NULL OR :title = '' "//
			+ "OR LOWER(b.title) LIKE LOWER(CONCAT('%', :title, '%'))) "//
			+ "AND (:isbn IS NULL OR :isbn = '' OR b.isbn = :isbn)", //
			nativeQuery = true)
	List<Book> searchNative(//
			@Param("title") String title, //
			@Param("isbn") String isbn//
	);

}
