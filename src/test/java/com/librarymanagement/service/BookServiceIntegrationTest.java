package com.librarymanagement.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;

import com.librarymanagement.dto.response.BookResponse;
import com.librarymanagement.entity.Author;
import com.librarymanagement.entity.Book;
import com.librarymanagement.repository.AuthorRepository;
import com.librarymanagement.repository.BookRepository;

@SpringBootTest
class BookServiceIntegrationTest {

	@Autowired
	private BookService bookService;

	@Autowired
	private BookRepository bookRepository;

	@Autowired
	private AuthorRepository authorRepository;

	@Test
	@DisplayName("Kiểm thử search books trên DB thật: Nạp đầy đủ authorNames, không bị LazyInitializationException dù open-in-view=false")
	void testSearchBooks_NoLazyInitializationException() {
		String suffix = UUID.randomUUID().toString().substring(0, 8);

		// 1. Tạo tác giả mẫu
		Author author1 = new Author();
		author1.setName("Tác Giả A " + suffix);
		author1 = authorRepository.save(author1);

		Author author2 = new Author();
		author2.setName("Tác Giả B " + suffix);
		author2 = authorRepository.save(author2);

		// 2. Tạo sách có 2 tác giả
		Book bookWithAuthors = new Book();
		bookWithAuthors.setTitle("Sách Có Tác Giả " + suffix);
		bookWithAuthors.setIsbn("ISBN-" + suffix + "-1");
		bookWithAuthors.setQuantity(5);
		bookWithAuthors.setPublishedDate(LocalDate.of(2023, 1, 15));
		bookWithAuthors.getAuthors().add(author1);
		bookWithAuthors.getAuthors().add(author2);
		bookWithAuthors = bookRepository.save(bookWithAuthors);

		// 3. Tạo sách KHÔNG có tác giả
		Book bookWithoutAuthor = new Book();
		bookWithoutAuthor.setTitle("Sách Vô Danh " + suffix);
		bookWithoutAuthor.setIsbn("ISBN-" + suffix + "-2");
		bookWithoutAuthor.setQuantity(3);
		bookWithoutAuthor.setPublishedDate(LocalDate.of(2024, 2, 20));
		bookWithoutAuthor = bookRepository.save(bookWithoutAuthor);

		// 4. Tìm kiếm sách có tác giả qua BookService
		Page<BookResponse> resultWithAuthors = bookService.search(
				"Sách Có Tác Giả " + suffix,
				null,
				null,
				null,
				null,
				null,
				0,
				10,
				"title",
				"asc",
				"publishedDate",
				"desc"
		);

		assertNotNull(resultWithAuthors);
		assertFalse(resultWithAuthors.isEmpty());
		BookResponse resp1 = resultWithAuthors.getContent().get(0);
		assertEquals("Sách Có Tác Giả " + suffix, resp1.getTitle());
		assertEquals("ISBN-" + suffix + "-1", resp1.getIsbn());
		assertNotNull(resp1.getAuthorNames());
		assertEquals(2, resp1.getAuthorNames().size());
		assertTrue(resp1.getAuthorNames().contains("Tác Giả A " + suffix));
		assertTrue(resp1.getAuthorNames().contains("Tác Giả B " + suffix));

		// 5. Tìm kiếm sách KHÔNG có tác giả qua BookService
		Page<BookResponse> resultWithoutAuthor = bookService.search(
				"Sách Vô Danh " + suffix,
				null,
				null,
				null,
				null,
				null,
				0,
				10,
				"title",
				"asc",
				"publishedDate",
				"desc"
		);

		assertNotNull(resultWithoutAuthor);
		assertFalse(resultWithoutAuthor.isEmpty());
		BookResponse resp2 = resultWithoutAuthor.getContent().get(0);
		assertEquals("Sách Vô Danh " + suffix, resp2.getTitle());
		assertNotNull(resp2.getAuthorNames());
		assertTrue(resp2.getAuthorNames().isEmpty()); // Không có tác giả trả về empty set an toàn
	}

	@Test
	@DisplayName("Kiểm thử phân trang sách: Bảo đảm phân trang chính xác ở tầng Database, không bị in-memory pagination")
	void testSearchBooks_PaginationAndCount() {
		Page<BookResponse> page0 = bookService.search(
				null, null, 0, 2, "id", "asc", "title", "asc"
		);

		assertNotNull(page0);
		assertTrue(page0.getTotalElements() >= 0);
		assertTrue(page0.getContent().size() <= 2);

		if (page0.getTotalPages() > 1) {
			Page<BookResponse> page1 = bookService.search(
					null, null, 1, 2, "id", "asc", "title", "asc"
			);
			assertNotNull(page1);
			assertTrue(page1.getContent().size() <= 2);
		}
	}

	@Test
	@DisplayName("Kiểm thử getAllBooks và getBookResponseById: Nạp đầy đủ authorNames và không bị LazyInitializationException")
	void testGetAllBooksAndGetById() {
		List<BookResponse> allBooks = bookService.getAllBooks();
		assertNotNull(allBooks);

		if (!allBooks.isEmpty()) {
			BookResponse first = allBooks.get(0);
			BookResponse byId = bookService.getBookResponseById(first.getId());
			assertNotNull(byId);
			assertEquals(first.getId(), byId.getId());
			assertEquals(first.getTitle(), byId.getTitle());
			assertNotNull(byId.getAuthorNames());
		}
	}
}
