package com.spironet.chargecore.dto;

import jdk.jshell.Snippet;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@Builder
@NoArgsConstructor
public class ServiceCenter {

    private String id;
    private String stationId;
    private String name;
    private Location location;

    private String specialization;
    private List<String> services;

    private boolean technicianAvailable;
    private int waitTime;


}
