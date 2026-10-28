package com.librarymanagement.entity;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "Books")
@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Book {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private String title;

	@Column(nullable = false, unique = true, length = 20)
	private String isbn;

	@Column(nullable = false)
	private Integer quantity;

	private LocalDate publishedDate;

	@Column(name = "image", length = 1000)
	private String image;

	@ManyToMany(fetch = FetchType.LAZY)
	@JoinTable(name = "book_authors", joinColumns = @JoinColumn(name = "book_id"), inverseJoinColumns = @JoinColumn(name = "author_id"))
	private Set<Author> authors = new HashSet<>();

	// BẮT BUỘC CÓ @JsonIgnore ĐỂ TRÁNH LỖI VÒNG LẶP VÔ TẬN KHI SERIALIZE SÁCH ĐÃ CÓ PHIẾU MƯỢN:
	// Book -> BorrowRecord -> Book -> BorrowRecord... gây lỗi:
	// "HttpMessageNotWritableException: Document nesting depth (501) exceeds the maximum allowed (500)"
	// Khi sửa một cuốn sách cũ (đã có lịch sử mượn), nếu không có @JsonIgnore thì Jackson sẽ đệ quy vô tận.
	@JsonIgnore
	@OneToMany(mappedBy = "book", fetch = FetchType.LAZY)
	private List<BorrowRecord> borrowRecords = new ArrayList<>();
}
