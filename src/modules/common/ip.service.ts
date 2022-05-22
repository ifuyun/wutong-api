import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { LoggerService } from '../logger/logger.service';
import { IPLocation } from './ip.interface';

@Injectable()
export class IpService {
  constructor(
    private readonly httpService: HttpService,
    private readonly logger: LoggerService
  ) {
  }

  async queryLocationFromAPI1(ip: string): Promise<IPLocation> {
    try {
      const data = (await lastValueFrom(this.httpService.get(`http://ip-api.com/json/${ip}`))).data;
      if (data.status !== 'success') {
        this.logger.warn({
          message: `[IP Query] from ip-api.com failed: ${data.message}`,
          data: ip
        });
        return Promise.reject(data.message);
      }
      return {
        IP: ip,
        country: data.country,
        countryCode: data.countryCode,
        region: data.regionName,
        regionCode: data.region,
        city: data.city,
        district: data.district,
        zipCode: data.zip,
        latitude: data.lat,
        longitude: data.lon,
        ISP: data.isp,
        org: data.org
      };
    } catch (e) {
      const message = e.message || 'unknown error';
      this.logger.warn({
        message: `[IP Query] from ip-api.com failed: ${message}`,
        data: ip
      });
      return Promise.reject(message);
    }
  }

  async queryLocationFromAPI2(ip: string): Promise<IPLocation> {
    try {
      const data = (await lastValueFrom(this.httpService.get(`https://ipapi.co/${ip}/json/`))).data;
      if (data?.error) {
        this.logger.warn({
          message: `[IP Query] from ipapi.co failed: ${data.reason}`,
          data: ip
        });
        return Promise.reject(data.reason);
      }
      return {
        IP: ip,
        country: data.country_name,
        countryCode: data.country_code,
        region: data.region,
        regionCode: data.region_code,
        city: data.city,
        district: '',
        zipCode: data.postal,
        latitude: data.latitude,
        longitude: data.longitude,
        ISP: data.org,
        org: data.org
      };
    } catch (e) {
      const message = e.message || 'unknown error';
      this.logger.warn({
        message: `[IP Query] from ipapi.co failed: ${message}`,
        data: ip
      });
      return Promise.reject(message);
    }
  }

  async queryLocation(ip: string): Promise<IPLocation | null> {
    return this.queryLocationFromAPI1(ip).catch(() => this.queryLocationFromAPI2(ip)).catch(() => null);
  }
}
