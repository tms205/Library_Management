package com.librarymanagement.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.librarymanagement.entity.Book;
import com.librarymanagement.service.BookService;

@RestController
@RequestMapping("api/books")
public class BookController {

	private final BookService bookService;

	public BookController(BookService bookService) {
		this.bookService = bookService;
	}

	@GetMapping("/search")
	public ResponseEntity<List<Book>> searchBooks(@RequestParam String title) {
		return ResponseEntity.ok(bookService.searchByTitle(title));
	}

}
