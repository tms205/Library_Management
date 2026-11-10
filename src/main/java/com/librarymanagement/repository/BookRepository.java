package com.librarymanagement.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.librarymanagement.entity.Book;

import jakarta.persistence.LockModeType;

//JpaSpecificationExecutor cung cấp sẵn các hàm:
//findAll(Specification<T> spec),
//findAll(Specification<T> spec, Pageable pageable), ...
public interface BookRepository extends JpaRepository<Book, Long>, JpaSpecificationExecutor<Book> {

	boolean existsByIsbn(String isbn);

	List<Book> findByTitleContainingIgnoreCase(String title);

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

	// Khóa dòng pessimistic write trên cuốn sách để ngăn overbooking và race condition tồn kho
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT b FROM Book b WHERE b.id = :id")
	Optional<Book> findByIdForUpdate(@Param("id") Long id);

	// Nạp trước tập hợp authors theo batch cho danh sách bookId đã phân trang (tránh N+1 và tránh in-memory pagination)
	@Query("SELECT DISTINCT b FROM Book b LEFT JOIN FETCH b.authors WHERE b.id IN :bookIds")
	List<Book> findAllWithAuthorsByIdIn(@Param("bookIds") List<Long> bookIds);

	// Nạp trước tập hợp authors cho toàn bộ sách
	@Query("SELECT DISTINCT b FROM Book b LEFT JOIN FETCH b.authors")
	List<Book> findAllWithAuthors();

	// Nạp trước tập hợp authors cho 1 cuốn sách theo ID
	@Query("SELECT b FROM Book b LEFT JOIN FETCH b.authors WHERE b.id = :id")
	Optional<Book> findByIdWithAuthors(@Param("id") Long id);
}
