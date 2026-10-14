package com.librarymanagement.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

//chứa ds data page hiện tại và các metadata(tổng trang, tổng số bản ghi)

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PageRespone<T> {

	private List<T> content;// danh sách bản ghi của trang hiện tại
	private int pageNumber;// trang hiện tại
	private int pageSize;// số phần tử mỗi trang
	private long totalElements;// tổng số bản ghi trong db khớp đìu kịn
	private int totalPages;// tổng số trag tính được
	private boolean isLast;// có phải trag cuối 0

}
