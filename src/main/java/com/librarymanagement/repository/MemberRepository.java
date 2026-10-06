package com.librarymanagement.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.librarymanagement.entity.Member;

public interface MemberRepository extends JpaRepository<Member, Long> {

}
