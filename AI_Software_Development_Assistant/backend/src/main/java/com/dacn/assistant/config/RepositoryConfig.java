package com.dacn.assistant.config;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
@Configuration
@EnableJpaRepositories(basePackages="com.dacn.assistant.repo", considerNestedRepositories=true)
public class RepositoryConfig {}
