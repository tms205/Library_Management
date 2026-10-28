package com.librarymanagement.dto.response;

import java.time.LocalDate;
import java.util.Set;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookResponse {

	private Long id;
	private String title;
	private String isbn;
	private Integer quantity;
	private LocalDate publishedDate;
	private String image;
	private Set<String> authorNames;// danh sách tên các tác giả
}
