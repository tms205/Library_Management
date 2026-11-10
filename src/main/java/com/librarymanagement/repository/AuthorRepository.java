package com.librarymanagement.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.librarymanagement.entity.Author;

public interface AuthorRepository extends JpaRepository<Author, Long> {
}
