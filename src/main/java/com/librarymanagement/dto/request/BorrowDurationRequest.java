package com.librarymanagement.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BorrowDurationRequest {

	@NotNull(message = "Thời hạn mượn sách không được để trống")
	@Min(value = 1, message = "Thời hạn mượn tối thiểu là 1 ngày")
	@Max(value = 365, message = "Thời hạn mượn tối đa là 365 ngày")
	private Integer borrowDurationDays;
}
