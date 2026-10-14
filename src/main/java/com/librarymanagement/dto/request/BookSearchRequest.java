package com.librarymanagement.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;

//validate data đầu vào, ràng buộc chặn mỗi trang tối đa 10 records
@Getter
@Setter
public class BookSearchRequest {
	private String title;
	private String isbn;

	@Min(value = 0, message = "Số trang phải từ 0 trở lên!")
	private int page = 0;

	@Min(value = 1, message = "Số lượng bản ghi mỗi trang phải ít nhất là 1!")
	@Max(value = 10, message = "Mỗi trang chỉ được tối đa 10 records theo quy định!")
	private int size = 10;// mặc định 10 bản ghi

	private String sortBy = "id"; // sắp xếp theo field nào(mặc định là id)

	private String sortDirection = "ASC"; // asc or desc

}
