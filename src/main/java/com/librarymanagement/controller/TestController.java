package com.librarymanagement.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class TestController {

	@GetMapping("/test")
	public ResponseEntity<String> test() {

		return ResponseEntity.ok("JWT hợp lệ - truy cập thành công!");
	}

	@GetMapping("/user/test")
	public ResponseEntity<String> userTest() {

		return ResponseEntity.ok("USER truy cập thành công!");
	}

	@GetMapping("/admin/test")
	public ResponseEntity<String> adminTest() {

		return ResponseEntity.ok("ADMIN truy cập thành công!");
	}
}