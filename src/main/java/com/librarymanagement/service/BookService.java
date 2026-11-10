package com.librarymanagement.service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

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
import com.librarymanagement.dto.response.BookResponse;
import com.librarymanagement.entity.Author;
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

	public BookService(
			BookRepository bookRepository, 
			BookCriteriaRepository bookCriteriaRepository) {
		this.bookRepository = bookRepository;
		this.bookCriteriaRepository = bookCriteriaRepository;
	}

	// viết tên hàm để spring tự hiểu: derived query method
	@Transactional(readOnly = true)
	public List<Book> searchByTitle(String title) {
		return bookRepository.findByTitleContainingIgnoreCase(title);
	}

	// Tìm kiếm sách theo Criteria API (phân trang chuẩn Database, batch fetch authors ngăn N+1 & LazyInitializationException)
	@Transactional(readOnly = true)
	public Page<BookResponse> search(
			String title,
			String isbn,
			String author,
			Boolean inStock,
			LocalDate fromDate,
			LocalDate toDate,
			int page,
			int size,
			String sortBy,
			String direction,
			String sortBy2,
			String direction2) {

		Page<Book> booksPage = bookCriteriaRepository.search(
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

		if (booksPage.isEmpty()) {
			return Page.empty(booksPage.getPageable());
		}

		List<Long> bookIds = booksPage.getContent().stream().map(Book::getId).toList();
		// Batch fetch authors cho các cuốn sách trong trang hiện tại trong 1 câu SQL duy nhất (không in-memory pagination, không N+1)
		List<Book> booksWithAuthors = bookRepository.findAllWithAuthorsByIdIn(bookIds);

		Map<Long, Set<String>> authorNamesMap = booksWithAuthors.stream()
				.collect(Collectors.toMap(
						Book::getId,
						b -> b.getAuthors() != null
								? b.getAuthors().stream().map(Author::getName).collect(Collectors.toSet())
								: Collections.emptySet(),
						(existing, replacement) -> existing
				));

		return booksPage.map(book -> toResponse(book, authorNamesMap.getOrDefault(book.getId(), Collections.emptySet())));
	}

	@Transactional(readOnly = true)
	public Page<BookResponse> search(
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
		Book book = bookRepository.findById(id).
				orElseThrow(() -> 
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

	// get book entity by id (dùng nội bộ cho các service khác như BorrowService)
	@Transactional(readOnly = true)
	public Book getBookById(Long id) {
		return bookRepository.findById(id)//
				.orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sách có id: " + id));
	}

	// get book response by id kèm tập hợp authors nạp đầy đủ trong transaction
	@Transactional(readOnly = true)
	public BookResponse getBookResponseById(Long id) {
		Book book = bookRepository.findByIdWithAuthors(id)
				.orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sách có id: " + id));
		return toResponse(book);
	}

	// get all book với đầy đủ authors nạp sẵn
	@Transactional(readOnly = true)
	public List<BookResponse> getAllBooks() {
		List<Book> books = bookRepository.findAllWithAuthors();
		return books.stream().map(this::toResponse).toList();
	}

	// Chuyển đổi an toàn từ Entity sang Response DTO bên trong transaction
	public BookResponse toResponse(Book book, Set<String> authorNames) {
		if (book == null) {
			return null;
		}
		return new BookResponse(
				book.getId(),
				book.getTitle(),
				book.getIsbn(),
				book.getQuantity(),
				book.getPublishedDate(),
				book.getImage(),
				authorNames != null ? authorNames : Collections.emptySet()
		);
	}

	public BookResponse toResponse(Book book) {
		if (book == null) {
			return null;
		}
		Set<String> authorNames = Collections.emptySet();
		try {
			if (book.getAuthors() != null) {
				authorNames = book.getAuthors().stream()
						.map(Author::getName)
						.collect(Collectors.toSet());
			}
		} catch (Exception e) {
			authorNames = Collections.emptySet();
		}
		return toResponse(book, authorNames);
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

			int rowNumber = 1;

			for (CSVRecord record : parser) {
				rowNumber++;

				String title = record.get("title");
				String isbn = record.get("isbn");
				String quantityStr = record.get("quantity");
				String publishedDateStr = record.isMapped("publishedDate") ? record.get("publishedDate") : null;
				String image = record.isMapped("image") ? record.get("image") : null;

				if (title == null || title.isBlank()) {
					throw new BadRequestException("Dòng " + rowNumber + ": Title không được để trống!");
				}

				if (isbn == null || isbn.isBlank()) {
					throw new BadRequestException("Dòng " + rowNumber + ": ISBN không được để trống!");
				}

				if (quantityStr == null || quantityStr.isBlank()) {
					throw new BadRequestException("Dòng " + rowNumber + ": Quantity không được để trống!");
				}

				if (!isbnInFile.add(isbn)) {
					throw new BadRequestException("Dòng " + rowNumber + ": ISBN '" + isbn + "' bị trùng trong file!");
				}

				if (bookRepository.existsByIsbn(isbn)) {
					throw new BadRequestException("Dòng " + rowNumber + ": ISBN '" + isbn + "' đã tồn tại trong hệ thống!");
				}

				int quantity;
				try {
					quantity = Integer.parseInt(quantityStr.trim());
					if (quantity < 0) {
						throw new BadRequestException("Dòng " + rowNumber + ": Quantity phải >= 0!");
					}
				} catch (NumberFormatException e) {
					throw new BadRequestException("Dòng " + rowNumber + ": Quantity phải là số nguyên!");
				}

				LocalDate publishedDate = null;
				if (publishedDateStr != null && !publishedDateStr.isBlank()) {
					try {
						publishedDate = LocalDate.parse(publishedDateStr.trim());
					} catch (Exception e) {
						throw new BadRequestException(
								"Dòng " + rowNumber + ": publishedDate không đúng định dạng (yyyy-MM-dd)!");
					}
				}

				Book book = new Book();
				book.setTitle(title.trim());
				book.setIsbn(isbn.trim());
				book.setQuantity(quantity);
				book.setPublishedDate(publishedDate);
				book.setImage(image != null && !image.isBlank() ? image.trim() : null);

				books.add(book);
			}

			if (books.isEmpty()) {
				throw new BadRequestException("File CSV không có dữ liệu!");
			}

			bookRepository.saveAll(books);

			log.info("Import thành công {} cuốn sách từ file CSV: {}", books.size(), fileName);
			return books.size();

		} catch (BadRequestException e) {
			throw e;
		} catch (Exception e) {
			log.error("Lỗi khi đọc file CSV: {}", e.getMessage(), e);
			throw new BadRequestException("Đọc file CSV thất bại: " + e.getMessage());
		}
	}
}
