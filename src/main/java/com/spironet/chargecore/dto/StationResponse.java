package com.spironet.chargecore.dto;

public class StationResponse<T> {
    private boolean success;
    private T data;
    private String error;
    private long timestamp;

    public StationResponse(boolean success, T data, String error) {
        this.success = success;
        this.data = data;
        this.error = error;
        this.timestamp = System.currentTimeMillis();
    }

    public static <T> StationResponse<T> success(T data) {
        return new StationResponse<>(true, data, null);
    }

    public static <T> StationResponse<T> error(String error) {
        return new StationResponse<>(false, null, error);
    }

    // Getters
    public boolean isSuccess() { return success; }
    public T getData() { return data; }
    public String getError() { return error; }
    public long getTimestamp() { return timestamp; }
}