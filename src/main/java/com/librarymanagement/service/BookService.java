package com.librarymanagement.service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.commons.io.input.BOMInputStream;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.librarymanagement.dto.request.CreateBookRequest;
import com.librarymanagement.dto.request.UpdateBookRequest;
import com.librarymanagement.entity.Book;
import com.librarymanagement.exception.BadRequestException;
import com.librarymanagement.exception.ResourceNotFoundException;
import com.librarymanagement.repository.BookCriteriaRepository;
import com.librarymanagement.repository.BookRepository;
import com.librarymanagement.specification.BookSpecification;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class BookService {

	private final BookRepository bookRepository;
	private final BookCriteriaRepository bookCriteriaRepository;

	public BookService(//
			BookRepository bookRepository, //
			BookCriteriaRepository bookCriteriaRepository) {
		this.bookRepository = bookRepository;
		this.bookCriteriaRepository = bookCriteriaRepository;

	}

	// các hàm search khác nhau

	// viết tên hàm để spring tự hiểu: derived query method
	@Transactional(readOnly = true)
	public List<Book> searchByTitle(String title) {
		return bookRepository.findByTitleContainingIgnoreCase(title);
	}

	// tự xây dưng query bằng CriteriaBuilder, Predicate,...: Criteria API
	@Transactional(readOnly = true)
	public Page<Book> search(
			String title,
			String isbn,
			String author,
			Boolean inStock,
			java.time.LocalDate fromDate,
			java.time.LocalDate toDate,
			int page,
			int size,
			String sortBy,
			String direction,
			String sortBy2,
			String direction2) {
		return bookCriteriaRepository.search(
				title,
				isbn,
				author,
				inStock,
				fromDate,
				toDate,
				page,
				size,
				sortBy,
				direction,
				sortBy2,
				direction2);
	}

	@Transactional(readOnly = true)
	public Page<Book> search(
			String title,
			String isbn,
			int page,
			int size,
			String sortBy,
			String direction,
			String sortBy2,
			String direction2) {
		return search(title, isbn, null, null, null, null, page, size, sortBy, direction, sortBy2, direction2);
	}

	// Specification: chia điều kiện search thành từng spec và ghép lại
	@Transactional(readOnly = true)
	public List<Book> searchWithSpecification(String title, String isbn) {
		Specification<Book> spec = BookSpecification.hasTitle(title)//
				.and(BookSpecification.hasIsbn(isbn));

		return bookRepository.findAll(spec);
	}

	// native query: viết sql thật trức tiếp trong @Query
	@Transactional(readOnly = true)
	public List<Book> searchNativeBooks(String title, String isbn) {
		return bookRepository.searchNative(title, isbn);
	}

	// CRUD
	// create
	@Transactional
	public Book createBook(CreateBookRequest request) {
		Book book = new Book();

		book.setTitle(request.getTitle());
		book.setIsbn(request.getIsbn());
		book.setQuantity(request.getQuantity());
		book.setPublishedDate(request.getPublishedDate());
		book.setImage(request.getImage());

		return bookRepository.save(book);
	}

	// update
	@Transactional
	public Book updateBook(Long id, UpdateBookRequest request) {
		Book book = bookRepository.findById(id).//
				orElseThrow(() -> //
				new ResourceNotFoundException("Không thấy sách có ID: " + id));

		book.setTitle(request.getTitle());
		book.setIsbn(request.getIsbn());
		book.setQuantity(request.getQuantity());
		book.setPublishedDate(request.getPublishedDate());
		if (request.getImage() != null) {
			book.setImage(request.getImage());
		}

		return bookRepository.save(book);
	}

	// delete
	@Transactional
	public void deleteBook(Long id) {
		Book book = bookRepository.findById(id)//
				.orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sách có id: " + id));

		bookRepository.delete(book);
	}

	// getbook by id
	@Transactional(readOnly = true)
	public Book getBookById(Long id) {
		return bookRepository.findById(id)//
				.orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sách có id: " + id));
	}

	// get all book
	@Transactional(readOnly = true)
	public List<Book> getAllBooks() {
		return bookRepository.findAll();

	}

	// import book from csv
	@Transactional
	public int importBooks(MultipartFile file) {

		if (file.isEmpty()) {
			throw new BadRequestException("File không được để trống!");
		}

		String fileName = file.getOriginalFilename();

		if (fileName == null || !fileName.toLowerCase().endsWith(".csv")) {

			throw new BadRequestException("Chỉ hỗ trợ file CSV!");
		}

		if (file.getSize() >= 5 * 1024 * 1024) {
			throw new BadRequestException("File phải nhỏ hơn 5MB!");
		}

		List<Book> books = new ArrayList<>();

		Set<String> isbnInFile = new HashSet<>();

		try (//
				BOMInputStream bomInputStream = BOMInputStream.builder().setInputStream(file.getInputStream()).get();

				BufferedReader reader = new BufferedReader(
						new InputStreamReader(bomInputStream, StandardCharsets.UTF_8));

				CSVParser parser = CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).get()
						.parse(reader)) {

			for (CSVRecord record : parser) {

				String title = record.get("title").trim();

				String isbn = record.get("isbn").trim();

				int quantity = Integer.parseInt(record.get("quantity").trim());

				LocalDate publishedDate = LocalDate.parse(record.get("publishedDate").trim());

				if (title.isBlank()) {
					throw new BadRequestException("Tiêu đề không được để trống!");
				}

				if (isbn.isBlank()) {
					throw new BadRequestException("ISBN không được để trống!");
				}

				if (quantity < 0) {
					throw new BadRequestException("Số lượng phải lớn hơn hoặc bằng 0!");
				}

				// Kiem tra trung ISBN trong chinh file CSV
				if (isbnInFile.contains(isbn)) {
					throw new BadRequestException("ISBN " + isbn + " bị trùng trong file CSV!");
				}

				// Kiem tra ISBN da ton tai trong database
				if (bookRepository.existsByIsbn(isbn)) {
					throw new BadRequestException("ISBN " + isbn + " đã tồn tại trong hệ thống!");
				}

				isbnInFile.add(isbn);

				Book book = new Book();

				book.setTitle(title);
				book.setIsbn(isbn);
				book.setQuantity(quantity);
				book.setPublishedDate(publishedDate);

				books.add(book);
			}

			bookRepository.saveAll(books);

			return books.size();

		} catch (BadRequestException exception) {

			throw exception;

		} catch (Exception exception) {

			log.error("Import CSV that bai!", exception);

			throw new BadRequestException("Import CSV thất bại. Vui lòng kiểm tra lại dữ liệu trong file!");
		}
	}
}