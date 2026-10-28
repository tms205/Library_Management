package com.librarymanagement.controller;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.librarymanagement.dto.request.CreateBookRequest;
import com.librarymanagement.dto.request.UpdateBookRequest;
import com.librarymanagement.dto.response.BookResponse;
import com.librarymanagement.entity.Book;
import com.librarymanagement.service.BookService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/books")
@SecurityRequirement(name = "bearerAuth")
public class BookController {

	private final BookService bookService;

	public BookController(BookService bookService) {
		this.bookService = bookService;
	}

	// API tìm kiếm sách đa tiêu chí: tiêu đề, ISBN, tác giả, trạng thái kho, khoảng ngày xuất bản
	// Phục vụ cả giao diện Web React và ứng dụng Di động Flutter/React Native
	@GetMapping("/search")
	public ResponseEntity<Page<BookResponse>> searchBooks(//
			@RequestParam(required = false) String title, //
			@RequestParam(required = false) String isbn, //
			@RequestParam(required = false) String author, //
			@RequestParam(required = false) Boolean inStock, //
			@RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate fromDate, //
			@RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate toDate, //
			@RequestParam(defaultValue = "0") int page, //
			@RequestParam(defaultValue = "10") int size, //
			@RequestParam(defaultValue = "title") String sortBy, //
			@RequestParam(defaultValue = "asc") String direction, //
			@RequestParam(defaultValue = "publishedDate") String sortBy2, //
			@RequestParam(defaultValue = "desc") String direction2//
	) {

		Page<Book> books;
		// Nếu không truyền các bộ lọc nâng cao (author, inStock, dates), gọi hàm 8 tham số cũ
		// để giữ tương thích tuyệt đối với các Unit Test Mockito đã viết trước đó
		if (author == null && inStock == null && fromDate == null && toDate == null) {
			books = bookService.search(//
					title, //
					isbn, //
					page, //
					Math.min(size, 10), //
					sortBy, //
					direction, //
					sortBy2, //
					direction2//
			);
		} else {
			books = bookService.search(//
					title, //
					isbn, //
					author, //
					inStock, //
					fromDate, //
					toDate, //
					page, //
					Math.min(size, 10), //
					sortBy, //
					direction, //
					sortBy2, //
					direction2//
			);
		}

		Page<BookResponse> response = books.map(this::toResponse);

		return ResponseEntity.ok(response);
	}

	// Backward-compatible search method for existing unit tests
	public ResponseEntity<Page<BookResponse>> searchBooks(
			String title,
			String isbn,
			int page,
			int size,
			String sortBy,
			String direction,
			String sortBy2,
			String direction2) {
		return searchBooks(title, isbn, null, null, null, null, page, size, sortBy, direction, sortBy2, direction2);
	}

	@GetMapping("/search-spec")
	public ResponseEntity<List<Book>> searchWithSpecification(@RequestParam(required = false) String title, //
			@RequestParam(required = false) String isbn//
	) {

		return ResponseEntity.ok(bookService.searchWithSpecification(title, isbn));

	}

	@GetMapping("/search-native")
	public ResponseEntity<List<Book>> searchNativeBooks(@RequestParam(required = false) String title,
			@RequestParam(required = false) String isbn) {

		return ResponseEntity.ok(bookService.searchNativeBooks(title, isbn));
	}

	@PostMapping
	public ResponseEntity<Book> createBook(@Valid @RequestBody CreateBookRequest request) {
		Book book = bookService.createBook(request);

		return ResponseEntity.status(HttpStatus.CREATED).body(book);
	}

	@PutMapping("/{id}")
	public ResponseEntity<Book> updateBook(@PathVariable Long id, @Valid @RequestBody UpdateBookRequest request) {

		return ResponseEntity.ok(bookService.updateBook(id, request));
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<Void> deleteBook(@PathVariable Long id) {
		bookService.deleteBook(id);

		return ResponseEntity.noContent().build();
	}

	@GetMapping("/{id}")
	public ResponseEntity<Book> getBookById(@PathVariable Long id) {
		return ResponseEntity.ok(bookService.getBookById(id));
	}

	@GetMapping
	public ResponseEntity<List<BookResponse>> getAllBooks() {

		List<BookResponse> response = bookService.getAllBooks()//
				.stream()//
				.map(this::toResponse)//
				.toList();

		return ResponseEntity.ok(response);
	}

	private BookResponse toResponse(Book book) {

		Set<String> authorNames = book.getAuthors()//
				.stream()//
				.map(author -> author.getName())//
				.collect(Collectors.toSet());//

		return new BookResponse(//
				book.getId(), //
				book.getTitle(), //
				book.getIsbn(), //
				book.getQuantity(), //
				book.getPublishedDate(), //
				book.getImage(), //
				authorNames//
		);
	}

	@PostMapping("/import")
	public ResponseEntity<Map<String, Object>> importBooks(@RequestParam("file") MultipartFile file) {//
		int total = bookService.importBooks(file);

		return ResponseEntity.ok(Map.of("message", "Import sách thành công!", "total", total));

	}

}