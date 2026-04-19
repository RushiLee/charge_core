package com.spironet.chargecore.controller;

import com.spironet.chargecore.dto.ServiceCenter;
import com.spironet.chargecore.dto.StationResponse;
import com.spironet.chargecore.service.ServiceCenterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
@RestController
@RequestMapping("/api/service-centers")
public class ServiceCenterController {

    private final ServiceCenterService service;

    public ServiceCenterController(ServiceCenterService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<StationResponse<List<ServiceCenter>>> getAll() {
        return ResponseEntity.ok(
                StationResponse.success(service.getAllServiceCenters())
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<StationResponse<ServiceCenter>> getById(@PathVariable String id) {
        return service.getById(id)
                .map(sc -> ResponseEntity.ok(StationResponse.success(sc)))
                .orElse(ResponseEntity.ok(StationResponse.error("Service center not found")));
    }

    @GetMapping("/station/{stationId}")
    public ResponseEntity<StationResponse<ServiceCenter>> getByStation(@PathVariable String stationId) {
        return service.getByStationId(stationId)
                .map(sc -> ResponseEntity.ok(StationResponse.success(sc)))
                .orElse(ResponseEntity.ok(StationResponse.error("No service center for station")));
    }

    @GetMapping("/specialization")
    public ResponseEntity<StationResponse<List<ServiceCenter>>> getBySpecialization(@RequestParam String type) {
        return ResponseEntity.ok(
                StationResponse.success(service.getBySpecialization(type))
        );
    }

    @GetMapping("/service")
    public ResponseEntity<StationResponse<List<ServiceCenter>>> getByService(@RequestParam String type) {
        return ResponseEntity.ok(
                StationResponse.success(service.getByService(type))
        );
    }
}
