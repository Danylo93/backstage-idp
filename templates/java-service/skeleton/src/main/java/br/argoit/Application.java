package br.argoit;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@SpringBootApplication
@RestController
public class Application {
  public static void main(String[] args) {
    SpringApplication.run(Application.class, args);
  }

  @GetMapping("/health")
  public String health() {
    return "ok";
  }

  @GetMapping("/ready")
  public Map<String, String> ready() {
    return Map.of("status", "ready");
  }

  @GetMapping("/info")
  public Map<String, String> info() {
    return Map.of(
      "service", "${{ values.name }}",
      "owner", "${{ values.owner }}",
      "system", "${{ values.system }}"
    );
  }
}
