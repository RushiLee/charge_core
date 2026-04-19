package com.spironet.chargecore.controller;

import com.spironet.chargecore.dto.Station;
import com.spironet.chargecore.dto.StationResponse;
import com.spironet.chargecore.service.StationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/stations")
public class StationController {
    private final StationService stationService;

    public StationController(StationService stationService) {
        this.stationService = stationService;
    }

    @GetMapping
    public ResponseEntity<StationResponse<List<Station>>> getAllStations() {
        return ResponseEntity.ok(StationResponse.success(stationService.getAllStations()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StationResponse<Station>> getStationById(@PathVariable String id) {
        return stationService.getStationById(id)
                .map(station -> ResponseEntity.ok(StationResponse.success(station)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(StationResponse.error("Station not found with id: " + id)));
    }

    // NEW ENDPOINT: Increase batteries
    @PostMapping("/{id}/increase")
    public ResponseEntity<?> increaseBattery(
            @PathVariable String id,
            @RequestParam(defaultValue = "1") int quantity) {
        try {
            Station updatedStation = stationService.increaseBattery(id, quantity);
            return ResponseEntity.ok(updatedStation);
        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(StationResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/{id}/reduce")
    public ResponseEntity<StationResponse<Station>> reduceBattery(@PathVariable String id) {
        try {
            Station updatedStation = stationService.reduceBattery(id);
            return ResponseEntity.ok(StationResponse.success(updatedStation));
        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(StationResponse.error(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(StationResponse.error(e.getMessage()));
        }
    }
}