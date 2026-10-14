package com.librarymanagement.controller;

import java.util.List;
import java.util.Map;

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

import com.librarymanagement.dto.CreateBookRequest;
import com.librarymanagement.dto.UpdateBookRequest;
import com.librarymanagement.entity.Book;
import com.librarymanagement.service.BookService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/books")
public class BookController {

	private final BookService bookService;

	public BookController(BookService bookService) {
		this.bookService = bookService;
	}

	@GetMapping("/search")
	public ResponseEntity<List<Book>> searchBooks(//
			@RequestParam(required = false) String title, //
			@RequestParam(required = false) String isbn, //
			@RequestParam(defaultValue = "0") int page, //
			@RequestParam(defaultValue = "10") int size, //
			@RequestParam(defaultValue = "title") String sortBy, //
			@RequestParam(defaultValue = "asc") String direction, //
			@RequestParam(defaultValue = "publishedDate") String sortBy2, //
			@RequestParam(defaultValue = "desc") String direction2) {//
		return ResponseEntity.ok(bookService.search(title, //
				isbn, //
				page, //
				Math.min(size, 10), //
				sortBy, //
				direction, //
				sortBy2, //
				direction2));//
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
	public ResponseEntity<List<Book>> getAllBooks() {
		return ResponseEntity.ok(bookService.getAllBooks());
	}

	@PostMapping("/import")
	public ResponseEntity<Map<String, Object>> importBooks(@RequestParam("file") MultipartFile file) {//
		int total = bookService.importBooks(file);

		return ResponseEntity.ok(Map.of("message", "Import sách thành công!", "total", total));

	}

}