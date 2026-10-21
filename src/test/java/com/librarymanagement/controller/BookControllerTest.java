package com.librarymanagement.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.librarymanagement.dto.response.BookResponse;
import com.librarymanagement.entity.Book;
import com.librarymanagement.service.BookService;

class BookControllerTest {

	private MockMvc mockMvc;

	private BookService bookService;

	private BookController bookController;

	@BeforeEach
	void setUp() {

		// Tao BookService gia
		bookService = org.mockito.Mockito.mock(BookService.class);

		// Dua service gia vao Controller
		bookController = new BookController(bookService);

		// Tao MockMvc de gia lap request HTTP
		mockMvc = MockMvcBuilders.standaloneSetup(bookController).build();
	}

	@Test
	void searchBooks_ShouldReturn200() {

		Book book = org.mockito.Mockito.mock(Book.class);

		when(book.getId()).thenReturn(1L);
		when(book.getTitle()).thenReturn("Clean Code");
		when(book.getIsbn()).thenReturn("9780132350884");
		when(book.getQuantity()).thenReturn(10);
		when(book.getPublishedDate()).thenReturn(null);
		when(book.getAuthors()).thenReturn(Set.of());

		Page<Book> page = new PageImpl<>(List.of(book));

		when(bookService.search(null, null, 0, 10, "title", "asc", "publishedDate", "desc")).thenReturn(page);

		ResponseEntity<Page<BookResponse>> response = bookController.searchBooks(null, null, 0, 10, "title", "asc",
				"publishedDate", "desc");

		assertEquals(200, response.getStatusCode().value());

		Page<BookResponse> body = response.getBody();

		assertNotNull(body);
		assertEquals(1, body.getContent().size());
		assertEquals(1L, body.getContent().get(0).getId());
		assertEquals("Clean Code", body.getContent().get(0).getTitle());
		assertEquals("9780132350884", body.getContent().get(0).getIsbn());
		assertEquals(10, body.getContent().get(0).getQuantity());
	}

	@Test
	void searchBooks_SizeGreaterThan10_ShouldLimitTo10() {

		when(bookService.search(null, null, 0, 10, "title", "asc", "publishedDate", "desc")).thenReturn(Page.empty());

		ResponseEntity<Page<BookResponse>> response = bookController.searchBooks(null, null, 0, 100, "title", "asc",
				"publishedDate", "desc");

		assertEquals(200, response.getStatusCode().value());

		verify(bookService).search(null, null, 0, 10, "title", "asc", "publishedDate", "desc");
	}

	@Test
	void getAllBooks_ShouldReturn200() throws Exception {

		Book book = org.mockito.Mockito.mock(Book.class);

		when(book.getId()).thenReturn(1L);
		when(book.getTitle()).thenReturn("Effective Java");
		when(book.getIsbn()).thenReturn("9780134685991");
		when(book.getQuantity()).thenReturn(8);
		when(book.getPublishedDate()).thenReturn(LocalDate.of(2018, 1, 6));
		when(book.getAuthors()).thenReturn(Set.of());

		when(bookService.getAllBooks()).thenReturn(List.of(book));

		mockMvc.perform(get("/api/books")).andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(1))
				.andExpect(jsonPath("$[0].title").value("Effective Java"))
				.andExpect(jsonPath("$[0].quantity").value(8));
	}

	@Test
	void deleteBook_ShouldReturn204() throws Exception {

		mockMvc.perform(delete("/api/books/5")).andExpect(status().isNoContent());

		verify(bookService).deleteBook(5L);
	}

	@Test
	void importBooks_ShouldReturn200() throws Exception {

		MockMultipartFile file = new MockMultipartFile("file", "books.csv", "text/csv",
				"title,isbn,quantity".getBytes());

		when(bookService.importBooks(file)).thenReturn(3);

		mockMvc.perform(multipart("/api/books/import").file(file)).andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(3));

		verify(bookService).importBooks(file);
	}
}