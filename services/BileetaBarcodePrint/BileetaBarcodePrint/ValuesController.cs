using BileetaBarcodePrint;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.IO.Ports;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Web.Http;

namespace TestPrint
{

    public class ValuesController : ApiController
    {
        SerialPort port1;
        [HttpGet]
        public string Test()
        {
            try
            {
                return "Success 1";
            }catch(Exception ex)
            {
                return "Errp";
            }
        }

        [HttpGet]
        public HttpResponseMessage GetString(string prodNo, string item, string clor, string thick, string width, string length, string remarks, string rolNo, string batchNo)
        {
            try
            {
                string printer = System.IO.File.ReadAllText(@"C:\BileetaBarcode\Printer.txt");
                bool exists = System.IO.Directory.Exists(@"C:\BarcodePrint");
                if (!exists)
                    System.IO.Directory.CreateDirectory(@"C:\BarcodePrint");

                string destinationFile = @"\\localhost\"+printer;
                string str = File.ReadAllText(@"C:\BarcodePrint\barcode_copy.txt");
                string _thik = "";
                string _width = "";
                string _length = "";
                string _colour = "";
                string _type = "";
                string _batch = "";
                try
                {
                    string replacement = Regex.Replace(remarks, @"\t|\n|\r", "");
                    char[] delimiters = new char[] { '|', ' ' };
                    StringBuilder sb = new StringBuilder();
                    var parts = remarks.Split(delimiters, StringSplitOptions.RemoveEmptyEntries).ToList().FindAll(a => a.Contains('Q')).ToList();
                    bool isFirst = true;
                    foreach (var item1 in parts)
                    {
                        if (!isFirst)
                        {
                            sb.Append("+");
                        }
                        sb.Append(item1.Split(':')[1]);
                        isFirst = false;
                    }
                    string finalString = sb.ToString();
                    str = str.Replace("_Remarks", finalString);

                }
                catch (Exception ex)
                {
                    str = str.Replace("_Remarks", "");
                }

                if (rolNo != "")
                {
                    int outRollNo = 0;
                    if (Int32.TryParse(rolNo, NumberStyles.Number, CultureInfo.CurrentCulture.NumberFormat, out outRollNo))
                    {
                        rolNo = outRollNo.ToString();
                    }
                    rolNo = Convert.ToDecimal(rolNo).ToString("G29");
                }
                str = str.Replace("_Roll", rolNo);

                if (length == "--None--")
                {
                    _length = "";
                }
                else
                {
                    try
                    {
                        //_length = Regex.Match(length, @"\d+").Value + " " + length.Split('(', ')')[1];
                        //_length = Regex.Split(length, @"[^0-9\.]+").Where(c => c != "." && c.Trim() != "").FirstOrDefault() + " " + length.Split('(', ')')[1];
                        _length = Regex.Split(length, @"[^0-9\.]+").Where(c => c != "." && c.Trim() != "").FirstOrDefault();

                        int outLength = 0;
                        if (Int32.TryParse(_length, NumberStyles.Number, CultureInfo.CurrentCulture.NumberFormat, out outLength))
                        {
                            _length = outLength.ToString();
                        }
                        _length = Convert.ToDecimal(_length).ToString("G29");

                        string uom = "";
                        if (length.Contains("(") && length.Contains(")"))
                        {
                            uom = length.Split('(', ')')[1];
                        }
                        else
                        {
                            uom = Regex.Match(length, @"[A-Za-z\-]+").ToString();
                        }

                        _length = _length + " " + uom;

                    }
                    catch (Exception ex)
                    {
                        _length = length;
                    }
                }
                str = str.Replace("_Length", _length);
                if (thick == "--None--")
                {
                    _thik = "";
                }
                else
                {
                    try
                    {
                        // _thik = Regex.Match(thick, @"\d+").Value + " " + thick.Split('(', ')')[1];
                        //_thik = Regex.Split(thick, @"[^0-9\.]+").Where(c => c != "." && c.Trim() != "").FirstOrDefault() + " " + thick.Split('(', ')')[1]; ;
                        _thik = Regex.Split(thick, @"[^0-9\.]+").Where(c => c != "." && c.Trim() != "").FirstOrDefault();

                        int outThick = 0;
                        if (Int32.TryParse(_thik, NumberStyles.Number, CultureInfo.CurrentCulture.NumberFormat, out outThick))
                        {
                            _thik = outThick.ToString();
                        }
                        _thik = Convert.ToDecimal(_thik).ToString("G29");

                        string uom = "";
                        if (thick.Contains("(") && thick.Contains(")"))
                        {
                            uom = thick.Split('(', ')')[1];
                        }
                        else
                        {
                            uom = Regex.Match(thick, @"[A-Za-z\-]+").ToString();
                        }

                        _thik = _thik + " " + uom;

                    }
                    catch (Exception ex)
                    {
                        _thik = thick;
                    }
                }
                if (width == "--None--")
                {
                    _width = "";
                }
                else
                {
                    try
                    {
                        //_width = "& " + Regex.Match(width, @"\d+").Value + " " + width.Split('(', ')')[1];
                        //_width = Regex.Split(width, @"[^0-9\.]+").Where(c => c != "." && c.Trim() != "").FirstOrDefault() + " " + width.Split('(', ')')[1];
                        _width = Regex.Split(width, @"[^0-9\.]+").Where(c => c != "." && c.Trim() != "").FirstOrDefault();

                        int outWidth = 0;
                        if (Int32.TryParse(_width, NumberStyles.Number, CultureInfo.CurrentCulture.NumberFormat, out outWidth))
                        {
                            _width = outWidth.ToString();
                        }
                        _width = Convert.ToDecimal(_width).ToString("G29");

                        string uom = "";
                        if (width.Contains("(") && width.Contains(")"))
                        {
                            uom = width.Split('(', ')')[1];
                        }
                        else
                        {
                            uom = Regex.Match(width, @"[A-Za-z\-]+").ToString();
                        }

                        _width = _width + " " + uom;

                    }
                    catch (Exception ex)
                    {
                        _width = width;
                    }
                }
                str = str.Replace("_Thick", _thik + " " + _width);

                if (clor == "--None--")
                {
                    _colour = "";
                }
                else
                {
                    _colour = clor;
                }
                str = str.Replace("_Colour", _colour);
                try
                {
                    str = str.Replace("_Item", item.Split('[', ']')[1]);
                }
                catch (Exception ex)
                {
                    str = str.Replace("_Item", item);
                }
                str = str.Replace("_ProductionNo", prodNo);
                try
                {
                    string[] strT = item.Split('[', ']')[1].Split('-');
                    _type = strT[strT.Length - 1];
                    if (_type == "A" || _type == "B" || _type == "MP" || _type == "DAM")
                    {

                    }
                    else
                    {
                        //_type = "";
                    }
                }
                catch (Exception ex)
                {
                    _type = "";
                }
                str = str.Replace("_Type", _type);

                if (batchNo != "")
                {
                    int outBatchNo = 0;
                    if (Int32.TryParse(batchNo, NumberStyles.Number, CultureInfo.CurrentCulture.NumberFormat, out outBatchNo))
                    {
                        batchNo = outBatchNo.ToString();
                    }
                    batchNo = Convert.ToDecimal(batchNo).ToString("G29");

                    _batch = batchNo + " / ";
                }
                if (batchNo == "")
                {
                    _batch = "";
                }
                str = str.Replace("_Batch", _batch);

                System.IO.File.WriteAllText(@"C:\BarcodePrint\barcode_template.txt", str);
                string sourceFile = @"C:\BarcodePrint\barcode_template.txt";
                File.Copy(sourceFile, destinationFile, true);
            }
            catch (Exception ex)
            {
                var response1 = new HttpResponseMessage();
                response1.Content = new StringContent(@"<!DOCTYPE html><html lang=""en""><head> <meta charset=""UTF-8""><meta name=""viewport"" content=""width=device-width, initial-scale=1.0""><meta http-equiv=""X-UA-Compatible"" content=""ie=edge"">
                        <title>Printing</title>
                    </head>
                    <body>
                        Error " + ex.Message + "<script>window.close(); </script></body> </html> ");
                response1.Content.Headers.ContentType = new MediaTypeHeaderValue("text/html");
                return response1;
            }
            var response = new HttpResponseMessage();
            response.Content = new StringContent(@"<!DOCTYPE html><html lang=""en""><head> <meta charset=""UTF-8""><meta name=""viewport"" content=""width=device-width, initial-scale=1.0""><meta http-equiv=""X-UA-Compatible"" content=""ie=edge"">
                        <title>Printing</title>
                    </head>
                    <body>
                        Print
                        <script>
                         window.close();
                        </script>
                    </body>
                    </html> ");
            response.Content.Headers.ContentType = new MediaTypeHeaderValue("text/html");
            return response;
        }

        [HttpGet]
        public HttpResponseMessage GetString(string prodNo, string item, string clor, string thick, string width, string length, string remarks, string rolNo)
        {
            try
            {
                string printer = System.IO.File.ReadAllText(@"C:\BileetaBarcode\Printer.txt");
                string batchNo = "";
                bool exists = System.IO.Directory.Exists(@"C:\BarcodePrint");
                if (!exists)
                    System.IO.Directory.CreateDirectory(@"C:\BarcodePrint");

                string destinationFile = @"\\localhost\"+printer;
                string str = File.ReadAllText(@"C:\BarcodePrint\barcode_copy.txt");
                string _thik = "";
                string _width = "";
                string _length = "";
                string _colour = "";
                string _type = "";
                string _batch = "";
                try
                {
                    string replacement = Regex.Replace(remarks, @"\t|\n|\r", "");
                    char[] delimiters = new char[] { '|', ' ' };
                    StringBuilder sb = new StringBuilder();
                    var parts = remarks.Split(delimiters, StringSplitOptions.RemoveEmptyEntries).ToList().FindAll(a => a.Contains('Q')).ToList();
                    bool isFirst = true;
                    foreach (var item1 in parts)
                    {
                        if (!isFirst)
                        {
                            sb.Append("+");
                        }
                        sb.Append(item1.Split(':')[1]);
                        isFirst = false;
                    }
                    string finalString = sb.ToString();
                    str = str.Replace("_Remarks", finalString);

                }
                catch (Exception ex)
                {
                    str = str.Replace("_Remarks", "");
                }

                if (rolNo != "")
                {
                    int outRollNo = 0;
                    if (Int32.TryParse(rolNo, NumberStyles.Number, CultureInfo.CurrentCulture.NumberFormat, out outRollNo))
                    {
                        rolNo = outRollNo.ToString();
                    }
                    rolNo = Convert.ToDecimal(rolNo).ToString("G29");
                }
                str = str.Replace("_Roll", rolNo);

                if (length == "--None--")
                {
                    _length = "";
                }
                else
                {
                    try
                    {
                        //_length = Regex.Match(length, @"\d+").Value + " " + length.Split('(', ')')[1];
                        //_length = Regex.Split(length, @"[^0-9\.]+").Where(c => c != "." && c.Trim() != "").FirstOrDefault() + " " + length.Split('(', ')')[1];
                        _length = Regex.Split(length, @"[^0-9\.]+").Where(c => c != "." && c.Trim() != "").FirstOrDefault();

                        int outLength = 0;
                        if (Int32.TryParse(_length, NumberStyles.Number, CultureInfo.CurrentCulture.NumberFormat, out outLength))
                        {
                            _length = outLength.ToString();
                        }
                        _length = Convert.ToDecimal(_length).ToString("G29");

                        string uom = "";
                        if (length.Contains("(") && length.Contains(")"))
                        {
                            uom = length.Split('(', ')')[1];
                        }
                        else
                        {
                            uom = Regex.Match(length, @"[A-Za-z\-]+").ToString();
                        }

                        _length = _length + " " + uom;

                    }
                    catch (Exception ex)
                    {
                        _length = length;
                    }
                }
                str = str.Replace("_Length", _length);
                if (thick == "--None--")
                {
                    _thik = "";
                }
                else
                {
                    try
                    {
                        // _thik = Regex.Match(thick, @"\d+").Value + " " + thick.Split('(', ')')[1];
                        //_thik = Regex.Split(thick, @"[^0-9\.]+").Where(c => c != "." && c.Trim() != "").FirstOrDefault() + " " + thick.Split('(', ')')[1];
                        _thik = Regex.Split(thick, @"[^0-9\.]+").Where(c => c != "." && c.Trim() != "").FirstOrDefault();

                        int outThick = 0;
                        if (Int32.TryParse(_thik, NumberStyles.Number, CultureInfo.CurrentCulture.NumberFormat, out outThick))
                        {
                            _thik = outThick.ToString();
                        }
                        _thik = Convert.ToDecimal(_thik).ToString("G29");

                        string uom = "";
                        if (thick.Contains("(") && thick.Contains(")"))
                        {
                            uom = thick.Split('(', ')')[1];
                        }
                        else
                        {
                            uom = Regex.Match(thick, @"[A-Za-z\-]+").ToString();
                        }

                        _thik = _thik + " " + uom;

                    }
                    catch (Exception ex)
                    {
                        _thik = thick;
                    }
                }
                if (width == "--None--")
                {
                    _width = "";
                }
                else
                {
                    try
                    {
                        //_width = "& " + Regex.Match(width, @"\d+").Value + " " + width.Split('(', ')')[1];
                        //_width = Regex.Split(width, @"[^0-9\.]+").Where(c => c != "." && c.Trim() != "").FirstOrDefault() + " " + width.Split('(', ')')[1];
                        _width = Regex.Split(width, @"[^0-9\.]+").Where(c => c != "." && c.Trim() != "").FirstOrDefault();

                        int outWidth = 0;
                        if (Int32.TryParse(_width, NumberStyles.Number, CultureInfo.CurrentCulture.NumberFormat, out outWidth))
                        {
                            _width = outWidth.ToString();
                        }
                        _width = Convert.ToDecimal(_width).ToString("G29");

                        string uom = "";
                        if (width.Contains("(") && width.Contains(")"))
                        {
                            uom = width.Split('(', ')')[1];
                        }
                        else
                        {
                            uom = Regex.Match(width, @"[A-Za-z\-]+").ToString();
                        }

                        _width = _width + " " + uom;

                    }
                    catch (Exception ex)
                    {
                        _width = width;
                    }
                }
                str = str.Replace("_Thick", _thik + " " + _width);

                if (clor == "--None--")
                {
                    _colour = "";
                }
                else
                {
                    _colour = clor;
                }
                str = str.Replace("_Colour", _colour);
                try
                {
                    str = str.Replace("_Item", item.Split('[', ']')[1]);
                }
                catch (Exception ex)
                {
                    str = str.Replace("_Item", item);
                }
                str = str.Replace("_ProductionNo", prodNo);
                try
                {
                    string[] strT = item.Split('[', ']')[1].Split('-');
                    _type = strT[strT.Length - 1];
                    if (_type == "A" || _type == "B" || _type == "MP" || _type == "DAM")
                    {

                    }
                    else
                    {
                        //_type = "";
                    }
                }
                catch (Exception ex)
                {
                    _type = "";
                }
                str = str.Replace("_Type", _type);

                if (batchNo != "")
                {
                    int outBatchNo = 0;
                    if (Int32.TryParse(batchNo, NumberStyles.Number, CultureInfo.CurrentCulture.NumberFormat, out outBatchNo))
                    {
                        batchNo = outBatchNo.ToString();
                    }
                    batchNo = Convert.ToDecimal(batchNo).ToString("G29");
                    _batch = batchNo + " / ";
                }
                if (batchNo == "")
                {
                    _batch = "";
                }
                str = str.Replace("_Batch", _batch);

                System.IO.File.WriteAllText(@"C:\BarcodePrint\barcode_template.txt", str);
                string sourceFile = @"C:\BarcodePrint\barcode_template.txt";
                File.Copy(sourceFile, destinationFile, true);
            }
            catch (Exception ex)
            {
                var response1 = new HttpResponseMessage();
                response1.Content = new StringContent(@"<!DOCTYPE html><html lang=""en""><head> <meta charset=""UTF-8""><meta name=""viewport"" content=""width=device-width, initial-scale=1.0""><meta http-equiv=""X-UA-Compatible"" content=""ie=edge"">
                        <title>Printing</title>
                    </head>
                    <body>
                        Error " + ex.Message + "<script>window.close(); </script></body> </html> ");
                response1.Content.Headers.ContentType = new MediaTypeHeaderValue("text/html");
                return response1;
            }
            var response = new HttpResponseMessage();
            response.Content = new StringContent(@"<!DOCTYPE html><html lang=""en""><head> <meta charset=""UTF-8""><meta name=""viewport"" content=""width=device-width, initial-scale=1.0""><meta http-equiv=""X-UA-Compatible"" content=""ie=edge"">
                        <title>Printing</title>
                    </head>
                    <body>
                        Print
                        <script>
                         window.close();
                        </script>
                    </body>
                    </html> ");
            response.Content.Headers.ContentType = new MediaTypeHeaderValue("text/html");
            return response;
        }

        [HttpGet]
        public HttpResponseMessage PrintBarcode(dynamic barcode)
        {
            try
            {
                string printer = System.IO.File.ReadAllText(@"C:\BileetaBarcode\Printer.txt");
                List<BarcodeTemplate> commTran = Newtonsoft.Json.JsonConvert.DeserializeObject(Convert.ToString(barcode), typeof(List<BarcodeTemplate>)) as List<BarcodeTemplate>;
                foreach (BarcodeTemplate item in commTran)
                {
                    int i = 0;
                    int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                    while (noOfBarcode > i)
                    {
                        string destinationFile = @"\\localhost\"+printer;
                        string str = File.ReadAllText(@"F:\JAT_BARCODE_TEST\Source\BarcodeTemplateJAT_1.txt");
                        str = str.Replace("@Barcode", item.BarcodeNo);
                        str = str.Replace("@ItemCode", item.ProductCode);
                        str = str.Replace("@ItemDsc", item.ProductDesc);
                        str = str.Replace("@Price", item.SellingPrice);
                        str = str.Replace("@Qty", item.Quantity);

                        string s1 = str;
                        System.IO.File.WriteAllText(@"F:\JAT_BARCODE_TEST\Source\BarcodeTemplateJAT_1_Temp.txt", str);
                        string sourceFile = @"F:\JAT_BARCODE_TEST\Source\BarcodeTemplateJAT_1_Temp.txt";
                        File.Copy(sourceFile, destinationFile, true);
                        Thread.Sleep(2000);
                        i++;
                    }
                }


            }
            #region Catch
            catch (Exception ex)
            {
                var response1 = new HttpResponseMessage();
                response1.Content = new StringContent(@"<!DOCTYPE html><html lang=""en""><head> <meta charset=""UTF-8""><meta name=""viewport"" content=""width=device-width, initial-scale=1.0""><meta http-equiv=""X-UA-Compatible"" content=""ie=edge"">
                        <title>Printing</title>
                    </head>
                    <body>
                        Error " + ex.Message + "<script>window.close(); </script></body> </html> ");
                response1.Content.Headers.ContentType = new MediaTypeHeaderValue("text/html");
                return response1;
            }
            var response = new HttpResponseMessage();
            response.Content = new StringContent(@"<!DOCTYPE html><html lang=""en""><head> <meta charset=""UTF-8""><meta name=""viewport"" content=""width=device-width, initial-scale=1.0""><meta http-equiv=""X-UA-Compatible"" content=""ie=edge"">
                        <title>Printing</title>
                    </head>
                    <body>
                        Print
                        <script>
                         window.close();
                        </script>
                    </body>
                    </html> ");
            response.Content.Headers.ContentType = new MediaTypeHeaderValue("text/html");
            return response;

            #endregion
        }

        [HttpGet]
        public bool PrintRequest([FromUri] string barcods)
        {
            try
            {
                string printer = System.IO.File.ReadAllText(@"C:\BileetaBarcode\Printer.txt");
                List<BarcodeTemplate> commTran = Newtonsoft.Json.JsonConvert.DeserializeObject(Convert.ToString(barcods), typeof(List<BarcodeTemplate>)) as List<BarcodeTemplate>;
                foreach (BarcodeTemplate item in commTran)
                {
                    #region 50mmx25mm

                    if (item.BarcodeTemplateId == "1") // SIZE 50 mm,25 mm TIN - Standard
                    {
                        string manufactureDate = item.ManufactureDate;
                        string expireDate = item.ExpiryDate;

                        int i = 0;
                        int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                        string decs1 = "";
                        string decs2 = "";
                        int length = item.ProductDesc.Length;
                        if (length <= 35)
                        {
                            decs1 = item.ProductDesc;
                        }
                        if (length > 35)
                        {
                            decs1 = item.ProductDesc.Substring(0, 35);
                            decs2 = item.ProductDesc.Substring(35, (length - 1) - 35);
                        }


                        while (noOfBarcode > i)
                        {
                            string destinationFile = @"\\localhost\"+printer;
                            string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mm25mm.txt", Encoding.Default);
                            str = str.Replace("@Barcode", item.BarcodeNo);
                            str = str.Replace("@ItemCode", item.ProductCode);
                            str = str.Replace("@Des1", decs1);
                            str = str.Replace("@Des2", decs2);
                            str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                            str = str.Replace("@Qty", item.Quantity);
                            str = str.Replace("@Count", item.NoOfBarcode);

                            str = str.Replace("@Mdf", item.ManufactureDate);
                            str = str.Replace("@Exp", item.ExpiryDate);
                            str = str.Replace("@bt", item.BarcodeType);
                            str = str.Replace("@BatchNo", item.BatchNo);

                            string type = item.BarcodeType;
                            if (type == "")
                            {
                                str = str.Replace("@S", item.BarcodeType);
                            }
                            else
                            {
                                str = str.Replace("@S", "");
                            }
                            string s1 = str;
                            System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mm25mm_Temp.txt", str, Encoding.Default);
                            string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\50mm25mm_Temp.txt";
                            File.Copy(sourceFile, destinationFile, true);
                            Thread.Sleep(100);
                            i++;
                        }
                    }
                    else if (item.BarcodeTemplateId == "18") // SIZE 50 mm,25 mm TIN - No Exp Standard
                    {

                        string manufactureDate = item.ManufactureDate;
                        string expireDate = item.ExpiryDate;

                        int i = 0;
                        int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                        string decs1 = "";
                        string decs2 = "";
                        int length = item.ProductDesc.Length;
                        if (length <= 35)
                        {
                            decs1 = item.ProductDesc;
                        }
                        if (length > 35)
                        {
                            decs1 = item.ProductDesc.Substring(0, 35);
                            decs2 = item.ProductDesc.Substring(35, (length - 1) - 35);
                        }


                        while (noOfBarcode > i)
                        {
                            string destinationFile = @"\\localhost\"+printer;
                            string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mm25mm.txt", Encoding.Default);
                            str = str.Replace("@Barcode", item.BarcodeNo);
                            str = str.Replace("@ItemCode", item.ProductCode);
                            str = str.Replace("@Des1", decs1);
                            str = str.Replace("@Des2", decs2);
                            str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                            str = str.Replace("@Qty", item.Quantity);
                            str = str.Replace("@Count", item.NoOfBarcode);

                            str = str.Replace("@Mdf", item.ManufactureDate);
                            str = str.Replace("@Exp", item.ExpiryDate);
                            str = str.Replace("@bt", item.BarcodeType);
                            str = str.Replace("@BatchNo", item.BatchNo);

                            string type = item.BarcodeType;
                            if (type == "")
                            {
                                str = str.Replace("@S", item.BarcodeType);
                            }
                            else
                            {
                                str = str.Replace("@S", "");
                            }
                            string s1 = str;
                            System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mm25mm_Temp.txt", str, Encoding.Default);
                            string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\50mm25mm_Temp.txt";
                            File.Copy(sourceFile, destinationFile, true);
                            Thread.Sleep(100);
                            i++;
                        }
                    }
                    else if (item.BarcodeTemplateId == "6") // SIZE 50 mm,25 mm TIN NO EXP
                    {
                        int i = 0;
                        int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                        string decs1 = "";
                        string decs2 = "";
                        int length = item.ProductDesc.Length;
                        if (length <= 35)
                        {
                            decs1 = item.ProductDesc;
                        }
                        if (length > 35)
                        {
                            decs1 = item.ProductDesc.Substring(0, 35);
                            decs2 = item.ProductDesc.Substring(35, (length - 1) - 35);
                        }


                        while (noOfBarcode > i)
                        {
                            string destinationFile = @"\\localhost\"+printer;
                            string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mmx25mmWoExp.txt", Encoding.Default);
                            str = str.Replace("@Barcode", item.BarcodeNo);
                            str = str.Replace("@ItemCode", item.ProductCode);
                            str = str.Replace("@Des1", decs1);
                            str = str.Replace("@Des2", decs2);
                            str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                            str = str.Replace("@Qty", item.Quantity);
                            str = str.Replace("@Count", item.NoOfBarcode);

                            str = str.Replace("@Mdf", item.ManufactureDate);
                            str = str.Replace("@Exp", item.ExpiryDate);
                            str = str.Replace("@bt", item.BarcodeType);
                            str = str.Replace("@BatchNo", item.BatchNo);

                            string type = item.BarcodeType;
                            if (type == "")
                            {
                                str = str.Replace("@S", item.BarcodeType);
                            }
                            else
                            {
                                str = str.Replace("@S", "");
                            }
                            string s1 = str;
                            System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mmx25mmWoExp_Temp.txt", str, Encoding.Default);
                            string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\50mmx25mmWoExp_Temp.txt";
                            File.Copy(sourceFile, destinationFile, true);
                            Thread.Sleep(100);
                            i++;
                        }
                    }

                    else if (item.BarcodeTemplateId == "10") // SIZE 50 mm,25 mm TIN CP
                    {
                        int i = 0;
                        int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                        string decs1 = "";
                        string decs2 = "";
                        int length = item.ProductDesc.Length;
                        if (length <= 35)
                        {
                            decs1 = item.ProductDesc;
                        }
                        if (length > 35)
                        {
                            decs1 = item.ProductDesc.Substring(0, 35);
                            decs2 = item.ProductDesc.Substring(35, (length - 1) - 35);
                        }
                        while (noOfBarcode > i)
                        {
                            string destinationFile = @"\\localhost\"+printer;
                            string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mmx25mmCP.txt", Encoding.Default);
                            str = str.Replace("@Barcode", item.BarcodeNo);
                            str = str.Replace("@ItemCode", item.ProductCode);
                            str = str.Replace("@Des1", decs1);
                            str = str.Replace("@Des2", decs2);
                            str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                            str = str.Replace("@Qty", item.Quantity);
                            str = str.Replace("@Count", item.NoOfBarcode);

                            str = str.Replace("@Mdf", item.ManufactureDate);
                            str = str.Replace("@Exp", item.ExpiryDate);
                            str = str.Replace("@bt", item.BarcodeType);
                            str = str.Replace("@BatchNo", item.BatchNo);

                            string type = item.BarcodeType;
                            if (type == "")
                            {
                                str = str.Replace("@S", item.BarcodeType);
                            }
                            else
                            {
                                str = str.Replace("@S", "");
                            }
                            string s1 = str;
                            System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mmx25mmCP_Temp.txt", str, Encoding.Default);
                            string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\50mmx25mmCP_Temp.txt";
                            File.Copy(sourceFile, destinationFile, true);
                            Thread.Sleep(100);
                            i++;
                        }
                    }

                    #endregion

                    #region 90mmx18mm

                    else if (item.BarcodeTemplateId == "4") // SIZE 90 mm,18 mm TIN
                    {
                        int i = 0;
                        int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                        while (noOfBarcode > i)
                        {
                            string destinationFile = @"\\localhost\"+printer;
                            string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\90mm18mm.txt", Encoding.Default);
                            str = str.Replace("@Barcode", item.BarcodeNo);
                            str = str.Replace("@ItemCode", item.ProductCode);
                            str = str.Replace("@Des1", item.ProductDesc);
                            str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                            //str = str.Replace("@Qty", item.Quantity);
                            //str = str.Replace("@Count", item.NoOfBarcode);

                            str = str.Replace("@Mdf", item.ManufactureDate);
                            str = str.Replace("@Exp", item.ExpiryDate);
                            str = str.Replace("@bt", item.BarcodeType);
                            str = str.Replace("@BatchNo", item.BatchNo);

                            string s1 = str;
                            System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\90mm18mm_Temp.txt", str, Encoding.Default);
                            string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\90mm18mm_Temp.txt";
                            File.Copy(sourceFile, destinationFile, true);
                            Thread.Sleep(100);
                            i++;
                        }
                    }

                    else if (item.BarcodeTemplateId == "9") // SIZE 90 mm,18 mm TIN No Exp
                    {
                        int i = 0;
                        int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);

                        while (noOfBarcode > i)
                        {
                            string destinationFile = @"\\localhost\"+printer;
                            string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\90mmx18mmWoExp.txt", Encoding.Default);
                            str = str.Replace("@Barcode", item.BarcodeNo);
                            str = str.Replace("@ItemCode", item.ProductCode);
                            str = str.Replace("@Des1", item.ProductDesc);
                            //str = str.Replace("@Des2", decs2);
                            str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                            //str = str.Replace("@Qty", item.Quantity);
                            //str = str.Replace("@Count", item.NoOfBarcode);

                            str = str.Replace("@Mdf", item.ManufactureDate);
                            str = str.Replace("@Exp", item.ExpiryDate);
                            str = str.Replace("@bt", item.BarcodeType);
                            str = str.Replace("@BatchNo", item.BatchNo);

                            string s1 = str;
                            System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\90mmx18mmWoExp_Temp.txt", str, Encoding.Default);
                            string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\90mmx18mmWoExp_Temp.txt";
                            File.Copy(sourceFile, destinationFile, true);
                            Thread.Sleep(100);
                            i++;
                        }
                    }

                    else if (item.BarcodeTemplateId == "11") // SIZE 90 mm,18 mm TIN CP
                    {
                        int i = 0;
                        int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);

                        while (noOfBarcode > i)
                        {
                            string destinationFile = @"\\localhost\"+printer;
                            string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\90mmx18mmCP.txt", Encoding.Default);
                            str = str.Replace("@Barcode", item.BarcodeNo);
                            str = str.Replace("@ItemCode", item.ProductCode);
                            str = str.Replace("@Des1", item.ProductDesc);
                            str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                            str = str.Replace("@Mdf", item.ManufactureDate);
                            str = str.Replace("@Exp", item.ExpiryDate);
                            str = str.Replace("@bt", item.BarcodeType);
                            str = str.Replace("@BatchNo", item.BatchNo);

                            string s1 = str;
                            System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\90mmx18mmCP_Temp.txt", str, Encoding.Default);
                            string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\90mmx18mmCP_Temp.txt";
                            File.Copy(sourceFile, destinationFile, true);
                            Thread.Sleep(100);
                            i++;
                        }
                    }
                    #endregion

                    #region 75 mm,100 mm BOX Pallet

                    else if (item.BarcodeTemplateId == "2") // 75 mm,100 mm BOX
                    {
                        int i = 0;
                        int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);

                        string decs1 = "";
                        string decs2 = "";
                        string decs3 = "";
                        int length = item.ProductDesc.Length;
                        if (length <= 30)
                        {
                            decs1 = item.ProductDesc;
                        }
                        if (length > 30 && length <= 60)
                        {
                            decs1 = item.ProductDesc.Substring(0, 30);
                            decs2 = item.ProductDesc.Substring(30, (length - 1) - 30);
                        }
                        if (length > 60)
                        {
                            decs1 = item.ProductDesc.Substring(0, 30);
                            decs2 = item.ProductDesc.Substring(30, 30);
                            decs3 = item.ProductDesc.Substring(60, (length - 1) - 60);
                        }
                        while (noOfBarcode > i)
                        {
                            string destinationFile = @"\\localhost\"+printer;
                            string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\75mm100mm.txt", Encoding.Default);
                            str = str.Replace("@Barcode", item.BarcodeNo);
                            str = str.Replace("@ItemCode", item.ProductCode);
                            str = str.Replace("@Des1", decs1);
                            str = str.Replace("@Des2", decs2);
                            str = str.Replace("@Des3", decs3);
                            str = str.Replace("@Price", item.SellingPrice);
                            str = str.Replace("@Qty", item.Quantity);

                            str = str.Replace("@Mdf", item.ManufactureDate);
                            str = str.Replace("@Exp", item.ExpiryDate);
                            str = str.Replace("@bt", item.BarcodeType);
                            str = str.Replace("@BatchNo", item.BatchNo);

                            string type = item.BarcodeType;
                            if (type == "")
                            {
                                str = str.Replace("@S", item.BarcodeType);
                            }
                            else
                            {
                                str = str.Replace("@S", "");
                            }
                            string s1 = str;
                            System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\75mm100mm_Temp.txt", str, Encoding.Default);
                            string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\75mm100mm_Temp.txt";
                            File.Copy(sourceFile, destinationFile, true);
                            Thread.Sleep(100);
                            i++;
                        }
                    }

                    else if (item.BarcodeTemplateId == "3") // 75 mm,100 mm PALLET
                    {
                        int i = 0;
                        int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);

                        string decs1 = "";
                        string decs2 = "";
                        string decs3 = "";
                        int length = item.ProductDesc.Length;
                        if (length <= 30)
                        {
                            decs1 = item.ProductDesc;
                        }
                        if (length > 30 && length <= 60)
                        {
                            decs1 = item.ProductDesc.Substring(0, 30);
                            decs2 = item.ProductDesc.Substring(30, (length - 1) - 30);
                        }
                        if (length > 60)
                        {
                            decs1 = item.ProductDesc.Substring(0, 30);
                            decs2 = item.ProductDesc.Substring(30, 30);
                            decs3 = item.ProductDesc.Substring(60, (length - 1) - 60);
                        }
                        while (noOfBarcode > i)
                        {
                            string destinationFile = @"\\localhost\"+printer;
                            string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\75mm100mm.txt", Encoding.Default);
                            str = str.Replace("@Barcode", item.BarcodeNo);
                            str = str.Replace("@ItemCode", item.ProductCode);
                            str = str.Replace("@Des1", decs1);
                            str = str.Replace("@Des2", decs2);
                            str = str.Replace("@Des3", decs3);
                            str = str.Replace("@Price", item.SellingPrice);
                            str = str.Replace("@Qty", item.Quantity);
                            str = str.Replace("@Mdf", item.ManufactureDate);
                            str = str.Replace("@Exp", item.ExpiryDate);
                            str = str.Replace("@bt", item.BarcodeType);
                            str = str.Replace("@BatchNo", item.BatchNo);

                            string type = item.BarcodeType;
                            if (type == "")
                            {
                                str = str.Replace("@S", item.BarcodeType);
                            }
                            else
                            {
                                str = str.Replace("@S", "");
                            }
                            string s1 = str;
                            System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\75mm100mm_Temp.txt", str, Encoding.Default);
                            string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\75mm100mm_Temp.txt";
                            File.Copy(sourceFile, destinationFile, true);
                            Thread.Sleep(100);
                            i++;
                        }
                    }

                    else if (item.BarcodeTemplateId == "8") // 75 mm,100 mm Pallet No Exp
                    {
                        int i = 0;
                        int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);

                        string decs1 = "";
                        string decs2 = "";
                        string decs3 = "";
                        int length = item.ProductDesc.Length;
                        if (length <= 30)
                        {
                            decs1 = item.ProductDesc;
                        }
                        if (length > 30 && length <= 60)
                        {
                            decs1 = item.ProductDesc.Substring(0, 30);
                            decs2 = item.ProductDesc.Substring(30, (length - 1) - 30);
                        }
                        if (length > 60)
                        {
                            decs1 = item.ProductDesc.Substring(0, 30);
                            decs2 = item.ProductDesc.Substring(30, 30);
                            decs3 = item.ProductDesc.Substring(60, (length - 1) - 60);
                        }
                        while (noOfBarcode > i)
                        {
                            string destinationFile = @"\\localhost\"+printer;
                            string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmWoExp.txt", Encoding.Default);
                            str = str.Replace("@Barcode", item.BarcodeNo);
                            str = str.Replace("@ItemCode", item.ProductCode);
                            str = str.Replace("@Des1", decs1);
                            str = str.Replace("@Des2", decs2);
                            str = str.Replace("@Des3", decs3);
                            str = str.Replace("@Price", item.SellingPrice);
                            str = str.Replace("@Qty", item.Quantity);

                            str = str.Replace("@Mdf", item.ManufactureDate);
                            str = str.Replace("@Exp", item.ExpiryDate);
                            str = str.Replace("@bt", item.BarcodeType);
                            str = str.Replace("@BatchNo", item.BatchNo);

                            string type = item.BarcodeType;
                            if (type == "")
                            {
                                str = str.Replace("@S", item.BarcodeType);
                            }
                            else
                            {
                                str = str.Replace("@S", "");
                            }
                            string s1 = str;
                            System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmWoExp_Temp.txt", str, Encoding.Default);
                            string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmWoExp_Temp.txt";
                            File.Copy(sourceFile, destinationFile, true);
                            Thread.Sleep(100);
                            i++;
                        }
                    }

                    else if (item.BarcodeTemplateId == "14") // 75 mm,100 mm Pallet No Exp
                    {
                        int i = 0;
                        int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);

                        string decs1 = "";
                        string decs2 = "";
                        string decs3 = "";
                        int length = item.ProductDesc.Length;
                        if (length <= 30)
                        {
                            decs1 = item.ProductDesc;
                        }
                        if (length > 30 && length <= 60)
                        {
                            decs1 = item.ProductDesc.Substring(0, 30);
                            decs2 = item.ProductDesc.Substring(30, (length - 1) - 30);
                        }
                        if (length > 60)
                        {
                            decs1 = item.ProductDesc.Substring(0, 30);
                            decs2 = item.ProductDesc.Substring(30, 30);
                            decs3 = item.ProductDesc.Substring(60, (length - 1) - 60);
                        }
                        while (noOfBarcode > i)
                        {
                            string destinationFile = @"\\localhost\"+printer;
                            string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmWoExp.txt", Encoding.Default);
                            str = str.Replace("@Barcode", item.BarcodeNo);
                            str = str.Replace("@ItemCode", item.ProductCode);
                            str = str.Replace("@Des1", decs1);
                            str = str.Replace("@Des2", decs2);
                            str = str.Replace("@Des3", decs3);
                            str = str.Replace("@Price", item.SellingPrice);
                            str = str.Replace("@Qty", item.Quantity);

                            str = str.Replace("@Mdf", item.ManufactureDate);
                            str = str.Replace("@Exp", item.ExpiryDate);
                            str = str.Replace("@bt", item.BarcodeType);
                            str = str.Replace("@BatchNo", item.BatchNo);

                            string type = item.BarcodeType;
                            if (type == "")
                            {
                                str = str.Replace("@S", item.BarcodeType);
                            }
                            else
                            {
                                str = str.Replace("@S", "");
                            }
                            string s1 = str;
                            System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmWoExp_Temp.txt", str, Encoding.Default);
                            string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmWoExp_Temp.txt";
                            File.Copy(sourceFile, destinationFile, true);
                            Thread.Sleep(100);
                            i++;
                        }
                    }

                    else if (item.BarcodeTemplateId == "12") // 75 mm,100 mm Pallet No Exp
                    {
                        int i = 0;
                        int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);

                        string decs1 = "";
                        string decs2 = "";
                        string decs3 = "";
                        int length = item.ProductDesc.Length;
                        if (length <= 30)
                        {
                            decs1 = item.ProductDesc;
                        }
                        if (length > 30 && length <= 60)
                        {
                            decs1 = item.ProductDesc.Substring(0, 30);
                            decs2 = item.ProductDesc.Substring(30, (length - 1) - 30);
                        }
                        if (length > 60)
                        {
                            decs1 = item.ProductDesc.Substring(0, 30);
                            decs2 = item.ProductDesc.Substring(30, 30);
                            decs3 = item.ProductDesc.Substring(60, (length - 1) - 60);
                        }
                        while (noOfBarcode > i)
                        {
                            string destinationFile = @"\\localhost\"+printer;
                            string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmCP.txt", Encoding.Default);
                            str = str.Replace("@Barcode", item.BarcodeNo);
                            str = str.Replace("@ItemCode", item.ProductCode);
                            str = str.Replace("@Des1", decs1);
                            str = str.Replace("@Des2", decs2);
                            str = str.Replace("@Des3", decs3);
                            str = str.Replace("@Price", item.SellingPrice);
                            str = str.Replace("@Qty", item.Quantity);

                            str = str.Replace("@Mdf", item.ManufactureDate);
                            str = str.Replace("@Exp", item.ExpiryDate);
                            str = str.Replace("@bt", item.BarcodeType);
                            str = str.Replace("@BatchNo", item.BatchNo);

                            string type = item.BarcodeType;
                            if (type == "")
                            {
                                str = str.Replace("@S", item.BarcodeType);
                            }
                            else
                            {
                                str = str.Replace("@S", "");
                            }
                            string s1 = str;
                            System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmCP_Temp.txt", str, Encoding.Default);
                            string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmCP_Temp.txt";
                            File.Copy(sourceFile, destinationFile, true);
                            Thread.Sleep(100);
                            i++;
                        }
                    }

                    else if (item.BarcodeTemplateId == "13") // 75 mm,100 mm Pallet No Exp
                    {
                        int i = 0;
                        int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);

                        string decs1 = "";
                        string decs2 = "";
                        string decs3 = "";
                        int length = item.ProductDesc.Length;
                        if (length <= 30)
                        {
                            decs1 = item.ProductDesc;
                        }
                        if (length > 30 && length <= 60)
                        {
                            decs1 = item.ProductDesc.Substring(0, 30);
                            decs2 = item.ProductDesc.Substring(30, (length - 1) - 30);
                        }
                        if (length > 60)
                        {
                            decs1 = item.ProductDesc.Substring(0, 30);
                            decs2 = item.ProductDesc.Substring(30, 30);
                            decs3 = item.ProductDesc.Substring(60, (length - 1) - 60);
                        }
                        while (noOfBarcode > i)
                        {
                            string destinationFile = @"\\localhost\"+printer;
                            string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmCP.txt", Encoding.Default);
                            str = str.Replace("@Barcode", item.BarcodeNo);
                            str = str.Replace("@ItemCode", item.ProductCode);
                            str = str.Replace("@Des1", decs1);
                            str = str.Replace("@Des2", decs2);
                            str = str.Replace("@Des3", decs3);
                            str = str.Replace("@Price", item.SellingPrice);
                            str = str.Replace("@Qty", item.Quantity);

                            str = str.Replace("@Mdf", item.ManufactureDate);
                            str = str.Replace("@Exp", item.ExpiryDate);
                            str = str.Replace("@bt", item.BarcodeType);
                            str = str.Replace("@BatchNo", item.BatchNo);

                            string type = item.BarcodeType;
                            if (type == "")
                            {
                                str = str.Replace("@S", item.BarcodeType);
                            }
                            else
                            {
                                str = str.Replace("@S", "");
                            }
                            string s1 = str;
                            System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmCP_Temp.txt", str, Encoding.Default);
                            string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmCP_Temp.txt";
                            File.Copy(sourceFile, destinationFile, true);
                            Thread.Sleep(100);
                            i++;
                        }
                    }


                    #endregion

                    #region 100mmx75mm Item

                    else if (item.BarcodeTemplateId == "7") // 75 mm,100 mm Item
                    {
                        int i = 0;
                        int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                        string decs1 = "";
                        string decs2 = "";
                        string decs3 = "";
                        int length = item.ProductDesc.Length;
                        if (length <= 30)
                        {
                            decs1 = item.ProductDesc;
                        }
                        if (length > 30 && length <= 60)
                        {
                            decs1 = item.ProductDesc.Substring(0, 30);
                            decs2 = item.ProductDesc.Substring(30, (length - 1) - 30);
                        }
                        if (length > 60)
                        {
                            decs1 = item.ProductDesc.Substring(0, 30);
                            decs2 = item.ProductDesc.Substring(30, 30);
                            decs3 = item.ProductDesc.Substring(60, (length - 1) - 60);
                        }
                        while (noOfBarcode > i)
                        {
                            string destinationFile = @"\\localhost\"+printer;
                            string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmItem.txt", Encoding.Default);
                            str = str.Replace("@Barcode", item.BarcodeNo);
                            str = str.Replace("@ItemCode", item.ProductCode);
                            str = str.Replace("@Des1", decs1);
                            str = str.Replace("@Des2", decs2);
                            str = str.Replace("@Des3", decs3);
                            str = str.Replace("@Price", item.SellingPrice);
                            str = str.Replace("@Qty", item.Quantity);

                            str = str.Replace("@Mdf", item.ManufactureDate);
                            str = str.Replace("@Exp", item.ExpiryDate);
                            str = str.Replace("@bt", item.BarcodeType);
                            str = str.Replace("@BatchNo", item.BatchNo);

                            string type = item.BarcodeType;
                            if (type == "")
                            {
                                str = str.Replace("@S", item.BarcodeType);
                            }
                            else
                            {
                                str = str.Replace("@S", "");
                            }
                            string s1 = str;
                            System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmItem_Temp.txt", str, Encoding.Default);
                            string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmItem_Temp.txt";
                            File.Copy(sourceFile, destinationFile, true);
                            Thread.Sleep(100);
                            i++;
                        }
                    }

                    else if (item.BarcodeTemplateId == "15") // 75 mm,100 mm Item
                    {
                        int i = 0;
                        int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                        string decs1 = "";
                        string decs2 = "";
                        string decs3 = "";
                        int length = item.ProductDesc.Length;
                        if (length <= 30)
                        {
                            decs1 = item.ProductDesc;
                        }
                        if (length > 30 && length <= 60)
                        {
                            decs1 = item.ProductDesc.Substring(0, 30);
                            decs2 = item.ProductDesc.Substring(30, (length - 1) - 30);
                        }
                        if (length > 60)
                        {
                            decs1 = item.ProductDesc.Substring(0, 30);
                            decs2 = item.ProductDesc.Substring(30, 30);
                            decs3 = item.ProductDesc.Substring(60, (length - 1) - 60);
                        }
                        while (noOfBarcode > i)
                        {
                            string destinationFile = @"\\localhost\"+printer;
                            string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmItemWoExp.txt", Encoding.Default);
                            str = str.Replace("@Barcode", item.BarcodeNo);
                            str = str.Replace("@ItemCode", item.ProductCode);
                            str = str.Replace("@Des1", decs1);
                            str = str.Replace("@Des2", decs2);
                            str = str.Replace("@Des3", decs3);
                            str = str.Replace("@Price", item.SellingPrice);
                            str = str.Replace("@Qty", item.Quantity);

                            str = str.Replace("@Mdf", item.ManufactureDate);
                            str = str.Replace("@Exp", item.ExpiryDate);
                            str = str.Replace("@bt", item.BarcodeType);
                            str = str.Replace("@BatchNo", item.BatchNo);

                            string type = item.BarcodeType;
                            if (type == "")
                            {
                                str = str.Replace("@S", item.BarcodeType);
                            }
                            else
                            {
                                str = str.Replace("@S", "");
                            }
                            string s1 = str;
                            System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmItemWoExp_Temp.txt", str, Encoding.Default);
                            string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmItemWoExp_Temp.txt";
                            File.Copy(sourceFile, destinationFile, true);
                            Thread.Sleep(100);
                            i++;
                        }
                    }

                    else if (item.BarcodeTemplateId == "16") // 75 mm,100 mm Item
                    {
                        int i = 0;
                        int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                        string decs1 = "";
                        string decs2 = "";
                        string decs3 = "";
                        int length = item.ProductDesc.Length;
                        if (length <= 30)
                        {
                            decs1 = item.ProductDesc;
                        }
                        if (length > 30 && length <= 60)
                        {
                            decs1 = item.ProductDesc.Substring(0, 30);
                            decs2 = item.ProductDesc.Substring(30, (length - 1) - 30);
                        }
                        if (length > 60)
                        {
                            decs1 = item.ProductDesc.Substring(0, 30);
                            decs2 = item.ProductDesc.Substring(30, 30);
                            decs3 = item.ProductDesc.Substring(60, (length - 1) - 60);
                        }
                        while (noOfBarcode > i)
                        {
                            string destinationFile = @"\\localhost\"+printer;
                            string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmItemCP.txt", Encoding.Default);
                            str = str.Replace("@Barcode", item.BarcodeNo);
                            str = str.Replace("@ItemCode", item.ProductCode);
                            str = str.Replace("@Des1", decs1);
                            str = str.Replace("@Des2", decs2);
                            str = str.Replace("@Des3", decs3);
                            str = str.Replace("@Price", item.SellingPrice);
                            str = str.Replace("@Qty", item.Quantity);

                            str = str.Replace("@Mdf", item.ManufactureDate);
                            str = str.Replace("@Exp", item.ExpiryDate);
                            str = str.Replace("@bt", item.BarcodeType);
                            str = str.Replace("@BatchNo", item.BatchNo);

                            string type = item.BarcodeType;
                            if (type == "")
                            {
                                str = str.Replace("@S", item.BarcodeType);
                            }
                            else
                            {
                                str = str.Replace("@S", "");
                            }
                            string s1 = str;
                            System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmItemCP_Temp.txt", str, Encoding.Default);
                            string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmItemCP_Temp.txt";
                            File.Copy(sourceFile, destinationFile, true);
                            Thread.Sleep(100);
                            i++;
                        }
                    }
                    #endregion

                    #region 50mmx15mm

                    else if (item.BarcodeTemplateId == "5") // SIZE 50 mm,15 mm TIN
                    {
                        int i = 0;
                        int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);

                        while (noOfBarcode > i)
                        {
                            string destinationFile = @"\\localhost\"+printer;
                            string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mm15mm.txt", Encoding.Default);
                            str = str.Replace("@Barcode", item.BarcodeNo);
                            str = str.Replace("@ItemCode", item.ProductCode);
                            str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                            str = str.Replace("@Mdf", item.ManufactureDate);
                            str = str.Replace("@BatchNo", item.BatchNo);
                            str = str.Replace("@bt", item.BarcodeType);
                            string s1 = str;
                            System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mm15mm_Temp.txt", str, Encoding.Default);
                            string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\50mm15mm_Temp.txt";
                            File.Copy(sourceFile, destinationFile, true);
                            Thread.Sleep(100);
                            i++;
                        }
                    }
                    else if (item.BarcodeTemplateId == "17") // SIZE 50 mm,15 mm TIN for Adj
                    {
                        int i = 0;
                        int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);

                        while (noOfBarcode > i)
                        {
                            string destinationFile = @"\\localhost\"+printer;
                            string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mm15mmAd.txt", Encoding.Default);
                            str = str.Replace("@Barcode", item.BarcodeNo);
                            str = str.Replace("@ItemCode", item.ProductCode);
                            str = str.Replace("@BatchNo", item.BatchNo);
                            str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                            str = str.Replace("@Mdf", item.ManufactureDate);
                            string s1 = str;
                            System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mm15mmAd_Temp.txt", str, Encoding.Default);
                            string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\50mm15mmAd_Temp.txt";
                            File.Copy(sourceFile, destinationFile, true);
                            Thread.Sleep(100);
                            i++;
                        }
                    }

                    #endregion

                    #region Pick List
                    else
                    {
                        int i = 0;
                        int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                        while (noOfBarcode > i)
                        {
                            string destinationFile = @"\\localhost\"+printer;
                            string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\PickList100mm75mm.txt", Encoding.Default);
                            str = str.Replace("@Barcode", item.BarcodeNo);
                            string s1 = str;
                            System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\PickList100mm75mm_Temp.txt", str, Encoding.Default);
                            string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\PickList100mm75mm_Temp.txt";
                            File.Copy(sourceFile, destinationFile, true);
                            Thread.Sleep(100);
                            i++;
                        }
                    }
                    #endregion
                }

                return true;
            }
            #region Catch
            catch (Exception ex)
            {
                throw new Exception("Printer not respond...!" + ex.Message);
            }
            #endregion
        }

        [HttpPost]
        public bool PrintRequest([FromBody] List<BarcodeTemplate> barcods)
        {
            try
            {
                string printer = System.IO.File.ReadAllText(@"C:\BileetaBarcode\Printer.txt");
                List<BarcodeTemplate> commTran = barcods;                

                if((commTran.FindAll(a => a.BarcodeTemplateId == "100").Count() > 0))
                {
                    var a = new Dictionary<int, BarcodeTemplate>();
                    int i = 1;
                    foreach (BarcodeTemplate item in barcods)
                    {
                        int count = Convert.ToInt32(item.NoOfBarcode);
                        for (int j = 0; j < count; j++)
                        {
                            a.Add(i, item);
                            i++;
                        }
                    }
                    int k = 1;
                    while (a.Count() >= k)
                    {
                        BarcodeTemplate item = a[k];
                        string destinationFile = @"\\localhost\" + printer;
                        string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\34mmx25mmx3.txt", Encoding.Default);
                        str = str.Replace("@Barcode1", item.BarcodeNo);                       
                        string[] item1PcArr = Spliter.spliter(item.ProductDesc, 35);
                        string productDec_Item1_1 = item1PcArr[0];
                        string productDsc_Item1_2 = item1PcArr[1];
                        string productDsc_Item1_3 = item1PcArr[2];

                        str = str.Replace("@Item1", item.ProductCode.Substring(4, item.ProductCode.Length - 4));//item.ProductCode.Substring(4,item.ProductCode.Length-4 )

                        str = str.Replace("@Location1", productDec_Item1_1.Substring(4, productDec_Item1_1.Length - 4));//item.ProductDesc.Substring(4,item.ProductDesc.Length-4 )
                        str = str.Replace("@Location2", productDsc_Item1_2);//item.ProductDesc.Substring(4,item.ProductDesc.Length-4 )
                        str = str.Replace("@Location3", productDsc_Item1_3);//item.ProductDesc.Substring(4,item.ProductDesc.Length-4 )

                        if (a.Count() >= (k + 1))
                        {
                            BarcodeTemplate item1 = a[k + 1];
                            if (item1 != null)
                            {
                                str = str.Replace("@Barcode2", item1.BarcodeNo);
                                str = str.Replace("@Item2", item1.ProductCode.Substring(4, item1.ProductCode.Length - 4));//item1.ProductCode.Substring(4,item1.ProductCode.Length-4 )

                                string[] item2PcArr = Spliter.spliter(item1.ProductDesc, 35);
                                string productDec_Item2_1 = item2PcArr[0];
                                string productDsc_Item2_2 = item2PcArr[1];
                                string productDsc_Item2_3 = item2PcArr[2];

                                str = str.Replace("@Location4", productDec_Item2_1.Substring(4, productDec_Item2_1.Length - 4));//item1.ProductDesc.Substring(4,item1.ProductDesc.Length-4 )
                                str = str.Replace("@Location5", productDsc_Item2_2);//item1.ProductDesc.Substring(4,item1.ProductDesc.Length-4 )
                                str = str.Replace("@Location6", productDsc_Item2_3);//item1.ProductDesc.Substring(4,item1.ProductDesc.Length-4 )
                            }
                            else
                            {
                                str = str.Replace(@"BARCODE 819,191,""128M"",62,0,180,1,2,""!104@Barcode2""", "");
                                str = str.Replace(@"TEXT 514,124,""ROMAN.TTF"",180,1,7,""@Barcode2""", "");
                                str = str.Replace("@Barcode2", "");
                                str = str.Replace("@Item2", "");
                                str = str.Replace("@Location4", "");
                                str = str.Replace("@Location5", "");
                                str = str.Replace("@Location6", "");
                            }
                        }
                        else
                        {
                            str = str.Replace(@"BARCODE 819,191,""128M"",62,0,180,1,2,""!104@Barcode2""", "");
                            str = str.Replace(@"TEXT 514,124,""ROMAN.TTF"",180,1,7,""@Barcode2""", "");
                            str = str.Replace("@Barcode2", "");
                            str = str.Replace("@Item2", "");
                            str = str.Replace("@Location4", "");
                            str = str.Replace("@Location5", "");
                            str = str.Replace("@Location6", "");
                        }

                        if (a.Count() >= (k + 2))
                        {
                            BarcodeTemplate item2 = a[k + 2];
                            if (item2 != null)
                            {
                                str = str.Replace("@Barcode3", item2.BarcodeNo);
                                str = str.Replace("@Item3", item2.ProductCode.Substring(4, item2.ProductCode.Length - 4));//item2.ProductCode.Substring(4,item2.ProductCode.Length-4 )

                                string[] item3PcArr = Spliter.spliter(item2.ProductDesc, 35);
                                string productDec_Item3_1 = item3PcArr[0];
                                string productDsc_Item3_2 = item3PcArr[1];
                                string productDsc_Item3_3 = item3PcArr[2];


                                str = str.Replace("@Location7", productDec_Item3_1.Substring(4, productDec_Item3_1.Length - 4));//item2.ProductDesc.Substring(4,item2.ProductDesc.Length-4 )
                                str = str.Replace("@Location8", productDsc_Item3_2);//item2.ProductDesc.Substring(4,item2.ProductDesc.Length-4 )
                                str = str.Replace("@Location9", productDsc_Item3_3);//item2.ProductDesc.Substring(4,item2.ProductDesc.Length-4 )
                            }
                            else
                            {
                                str = str.Replace("@Barcode3", "");
                                str = str.Replace("@Item3", "");
                                str = str.Replace("@Location7", "");
                                str = str.Replace("@Location8", "");
                                str = str.Replace("@Location9", "");
                            }
                        }
                        else
                        {
                            str = str.Replace("@Barcode3", "");
                            str = str.Replace("@Item3", "");
                            str = str.Replace("@Location7", "");
                            str = str.Replace("@Location8", "");
                            str = str.Replace("@Location9", "");
                        }
                        System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\34mmx25mmx3_Temp.txt", str, Encoding.Default);
                        string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\34mmx25mmx3_Temp.txt";
                        File.Copy(sourceFile, destinationFile, true);
                        Thread.Sleep(100);
                        k = k+3;
                    }
                }

                else if ((commTran.FindAll(a => a.BarcodeTemplateId == "31").Count() > 0))
                {
                    var a = new Dictionary<int, BarcodeTemplate>();
                    int i = 1;
                    foreach (BarcodeTemplate item in barcods)
                    {
                        if(item.BarcodeTemplateId == "31")
                        {
                            int count = Convert.ToInt32(item.NoOfBarcode);
                            for (int j = 0; j < count; j++)
                            {
                                a.Add(i, item);
                                i++;
                            }
                        }                        
                    }
                    int k = 1;
                    while (a.Count() >= k)
                    {
                        BarcodeTemplate item = a[k];
                        string destinationFile = @"\\localhost\" + printer;
                        string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mmx25mmx2MIP.txt", Encoding.Default);
                        str = str.Replace("@ProductCode1", item.ProductCode);
                        str = str.Replace("@DocNo1", item.DocNo);
                        str = str.Replace("@Mrp1", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                        str = str.Replace("@PluCode1", item.PluCode);

                        if (a.Count() > k)
                        {
                            BarcodeTemplate item1 = a[k + 1];
                            str = str.Replace("@ProductCode2", item1.ProductCode);
                            str = str.Replace("@DocNo2", item1.DocNo);
                            str = str.Replace("@Mrp2", Convert.ToDecimal(item1.SellingPrice).ToString("0.00"));
                            str = str.Replace("@PluCode2", item1.PluCode);
                        }
                        else
                        {
                            str = str.Replace("@ProductCode2", "");
                            str = str.Replace("@DocNo2", "");
                            str = str.Replace("@Mrp2", "");
                            str = str.Replace("@PluCode2", "");
                        }

                        System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mmx25mmx2MIP_Temp.txt", str, Encoding.Default);
                        string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\50mmx25mmx2MIP_Temp.txt";
                        File.Copy(sourceFile, destinationFile, true);
                        Thread.Sleep(100);
                        k = k + 2;
                    }                   
                }

                else if ((commTran.FindAll(a => a.BarcodeTemplateId == "37").Count() > 0))
                {
                    var a = new Dictionary<int, BarcodeTemplate>();
                    int i = 1;
                    foreach (BarcodeTemplate item in barcods)
                    {
                        if (item.BarcodeTemplateId == "37")
                        {
                            int count = Convert.ToInt32(item.NoOfBarcode);
                            for (int j = 0; j < count; j++)
                            {
                                a.Add(i, item);
                                i++;
                            }
                        }
                    }
                    int k = 1;
                    while (a.Count() >= k)
                    {
                        BarcodeTemplate item = a[k];
                        string destinationFile = @"\\localhost\" + printer;
                        string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mmx25mmx2MIP.txt", Encoding.Default);
                        str = str.Replace("@ProductCode1", item.ProductCode);
                        str = str.Replace("@DocNo1", item.DocNo);
                        str = str.Replace("@Mrp1", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                        str = str.Replace("@PluCode1", item.PluCode);

                        if (a.Count() > k)
                        {
                            BarcodeTemplate item1 = a[k + 1];
                            str = str.Replace("@ProductCode2", item1.ProductCode);
                            str = str.Replace("@DocNo2", item1.DocNo);
                            str = str.Replace("@Mrp2", Convert.ToDecimal(item1.SellingPrice).ToString("0.00"));
                            str = str.Replace("@PluCode2", item1.PluCode);
                        }
                        else
                        {
                            str = str.Replace("@ProductCode2", "");
                            str = str.Replace("@DocNo2", "");
                            str = str.Replace("@Mrp2", "");
                            str = str.Replace("@PluCode2", "");
                        }

                        System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mmx25mmx2MIP_Temp.txt", str, Encoding.Default);
                        string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\50mmx25mmx2MIP_Temp.txt";
                        File.Copy(sourceFile, destinationFile, true);
                        Thread.Sleep(100);
                        k = k + 2;
                    }
                }
                if ((commTran.FindAll(a=>a.BarcodeTemplateId == "26").Count() > 0) || commTran.FindAll(a => a.BarcodeTemplateId == "27").Count() > 0)
                {
                    var a = new Dictionary<int, BarcodeTemplate>();
                    int i = 1;
                    foreach (BarcodeTemplate item in barcods)
                    {
                        if(item.BarcodeTemplateId == "26" || item.BarcodeTemplateId == "27")
                        {
                            int count = Convert.ToInt32(item.NoOfBarcode);
                            for (int j = 0; j < count; j++)
                            {
                                a.Add(i, item);
                                i++;
                            }
                        }
                                           
                    }
                    int k = 1;
                    while(a.Count() >= k)
                    {
                        BarcodeTemplate item = a[k];
                        string destinationFile = @"\\localhost\" + printer;
                        string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mmx25mmx2.txt", Encoding.Default);
                        str = str.Replace("@ProductCode1", item.ProductCode);
                        str = str.Replace("@PluCode1", item.PluCode);
                       
                        str = str.Replace("@DocNo1", item.DocNo);
                        str = str.Replace("@Mrp1", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));

                        if(item.Temp_TemplateId == "26")
                        {
                            str = str.Replace("@Mfd1", item.PostDate);
                            str = str.Replace("@t261", "Best before use 5 years from the MFD");
                            str = str.Replace("@t271", "");                          
                            str = str.Replace("EXP1", "");
                        }
                       else
                        {
                            str = str.Replace("@Mfd1", "");
                            str = str.Replace("@t261", "");
                            str = str.Replace("@t271", "Mentioned in the product");
                            str = str.Replace("EXP1", "EXP");
                        }
                        if (item.BarcodeNo.Count() > 0)
                        {
                            str = str.Replace("@BarcodeNo1", item.BarcodeNo);
                            str = str.Replace("@a1", item.BarcodeNo.Substring(0, 1));
                            str = str.Replace("@b1", item.BarcodeNo.Substring(1, 1));
                            str = str.Replace("@c1", item.BarcodeNo.Substring(2, 1));
                            str = str.Replace("@d1", item.BarcodeNo.Substring(3, 1));
                            str = str.Replace("@e1", item.BarcodeNo.Substring(4, 1));
                            str = str.Replace("@f1", item.BarcodeNo.Substring(5, 1));
                            str = str.Replace("@g1", item.BarcodeNo.Substring(6, 1));
                            str = str.Replace("@h1", item.BarcodeNo.Substring(7, 1));
                            str = str.Replace("@i1", item.BarcodeNo.Substring(8, 1));
                            str = str.Replace("@j1", item.BarcodeNo.Substring(9, 1));
                            str = str.Replace("@k1", item.BarcodeNo.Substring(10, 1));
                            str = str.Replace("@l1", item.BarcodeNo.Substring(11, 1));
                            str = str.Replace("@m1", item.BarcodeNo.Substring(12, 1));
                        }
                        else
                        {
                            str = str.Replace(@"BARCODE 775,73,""EAN13"",45,0,180,3,6,""@BarcodeNo1""", "");
                            str = str.Replace("@BarcodeNo1", "");
                            str = str.Replace("@a1", "");
                            str = str.Replace("@b1", "");
                            str = str.Replace("@c1", "");
                            str = str.Replace("@d1", "");
                            str = str.Replace("@e1", "");
                            str = str.Replace("@f1", "");
                            str = str.Replace("@g1", "");
                            str = str.Replace("@h1", "");
                            str = str.Replace("@i1", "");
                            str = str.Replace("@j1", "");
                            str = str.Replace("@k1", "");
                            str = str.Replace("@l1", "");
                            str = str.Replace("@m1", "");
                        }


                        if (a.Count() > k)
                        {
                            BarcodeTemplate item1 = a[k + 1];

                            str = str.Replace("@ProductCode2", item1.ProductCode);
                            str = str.Replace("@PluCode2", item1.PluCode);
                            //str = str.Replace("@Mfd2", item1.PostDate);
                            str = str.Replace("@DocNo2", item1.DocNo);
                            str = str.Replace("@Mrp2", Convert.ToDecimal(item1.SellingPrice).ToString("0.00"));
                            if (item1.Temp_TemplateId == "27")
                            {
                                str = str.Replace("@Mfd2", "");
                                str = str.Replace("@t262", ""); 
                                str = str.Replace("@t272", "Mentioned in the product");
                                str = str.Replace("EXP2", "EXP");
                            }
                            else
                            {
                                str = str.Replace("@Mfd2", item1.PostDate);
                                str = str.Replace("@t262", "Best before use 5 years from the MFD");
                                str = str.Replace("@t272", "");
                                str = str.Replace("EXP2", "");
                            }
                            if (item1.BarcodeNo.Count() > 0)
                            {
                                str = str.Replace("@BarcodeNo2", item1.BarcodeNo);
                                str = str.Replace("@a2", item1.BarcodeNo.Substring(0, 1));
                                str = str.Replace("@b2", item1.BarcodeNo.Substring(1, 1));
                                str = str.Replace("@c2", item1.BarcodeNo.Substring(2, 1));
                                str = str.Replace("@d2", item1.BarcodeNo.Substring(3, 1));
                                str = str.Replace("@e2", item1.BarcodeNo.Substring(4, 1));
                                str = str.Replace("@f2", item1.BarcodeNo.Substring(5, 1));
                                str = str.Replace("@g2", item1.BarcodeNo.Substring(6, 1));
                                str = str.Replace("@h2", item1.BarcodeNo.Substring(7, 1));
                                str = str.Replace("@i2", item1.BarcodeNo.Substring(8, 1));
                                str = str.Replace("@j2", item1.BarcodeNo.Substring(9, 1));
                                str = str.Replace("@k2", item1.BarcodeNo.Substring(10, 1));
                                str = str.Replace("@l2", item1.BarcodeNo.Substring(11, 1));
                                str = str.Replace("@m2", item1.BarcodeNo.Substring(12, 1));
                            }
                            else
                            {
                                str = str.Replace(@"BARCODE 348,73,""EAN13"",45,0,180,3,6,""@BarcodeNo2""", "");
                                str = str.Replace("@BarcodeNo2", "");
                                str = str.Replace("@a2", "");
                                str = str.Replace("@b2", "");
                                str = str.Replace("@c2", "");
                                str = str.Replace("@d2", "");
                                str = str.Replace("@e2", "");
                                str = str.Replace("@f2", "");
                                str = str.Replace("@g2", "");
                                str = str.Replace("@h2", "");
                                str = str.Replace("@i2", "");
                                str = str.Replace("@j2", "");
                                str = str.Replace("@k2", "");
                                str = str.Replace("@l2", "");
                                str = str.Replace("@m2", "");
                            }
                        }
                        else
                        {
                            str = str.Replace(@"BARCODE 348,73,""EAN13"",45,0,180,3,6,""@BarcodeNo2""", "");
                            str = str.Replace("@BarcodeNo2", "");

                            str = str.Replace("@ProductCode2", "");
                            str = str.Replace("@PluCode2", "");
                            str = str.Replace("@Mfd2", "");
                            str = str.Replace("@DocNo2", "");
                            str = str.Replace("@Mrp2", "");
                            str = str.Replace("@a2", "");
                            str = str.Replace("@b2", "");
                            str = str.Replace("@c2", "");
                            str = str.Replace("@d2", "");
                            str = str.Replace("@e2", "");
                            str = str.Replace("@f2", "");
                            str = str.Replace("@g2", "");
                            str = str.Replace("@h2", "");
                            str = str.Replace("@i2", "");
                            str = str.Replace("@j2", "");
                            str = str.Replace("@k2", "");
                            str = str.Replace("@l2", "");
                            str = str.Replace("@m2", "");
                        }

                        System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mmx25mmx2_Temp.txt", str, Encoding.Default);
                        string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\50mmx25mmx2_Temp.txt";
                        File.Copy(sourceFile, destinationFile, true);
                        Thread.Sleep(100);
                        k = k + 2;
                    }                              
                }                
                else
                {
                    foreach (BarcodeTemplate item in commTran)
                    {
                        if(item.BarcodeTemplateId == "100")
                        {
                            break;
                        }

                        #region 50mmx25mm

                        if (item.BarcodeTemplateId == "1" || item.BarcodeTemplateId == "18") // SIZE 50 mm,25 mm TIN - Standard
                        {

                            string mnfDate = item.ManufactureDate;
                            string expDate = item.ExpiryDate;

                            if (item.BarcodeTemplateId == "18")
                            {
                                DateTime _mfDate = Convert.ToDateTime(mnfDate);
                                DateTime _ExpDate = Convert.ToDateTime(expDate);

                                double selfLife = (_ExpDate - _mfDate).TotalDays;
                                DateTime _newMfDate = new DateTime(2017, _mfDate.Month, _mfDate.Day);
                                DateTime _newExpDate = _newMfDate.AddDays(selfLife);
                                mnfDate = _newMfDate.ToString("yyyy-MM-dd");
                                expDate = _newExpDate.ToString("yyyy-MM-dd");
                            }

                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                            string decs1 = "";
                            string decs2 = "";
                            string[] t1 = Spliter.spliter(item.ProductDesc, 35);
                            decs1 = t1[0];
                            decs2 = t1[1];
                            int j = 1;

                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mm25mm.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@Des1", decs1);
                                str = str.Replace("@Des2", decs2);
                                str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                                str = str.Replace("@Qty", item.Quantity);
                                str = str.Replace("@Count", item.NoOfBarcode);

                                str = str.Replace("@Mdf", mnfDate);
                                str = str.Replace("@Exp", expDate);
                                str = str.Replace("@bt", item.BarcodeType);
                                str = str.Replace("@BatchNo", item.BatchNo);
                                if (item.PackingLevelId == "0")
                                {

                                    str = str.Replace("@SeqId", "I-" + (j).ToString());
                                    j++;
                                }
                                string type = item.BarcodeType;
                                if (type == "")
                                {
                                    str = str.Replace("@S", item.BarcodeType);
                                }
                                else
                                {
                                    str = str.Replace("@S", "");
                                }
                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mm25mm_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\50mm25mm_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }
                        ////////////////////////////////////////////////////

                        if (item.BarcodeTemplateId == "32") // SIZE 50 mm,25 mm TIN - Standard
                        {

                            string mnfDate = item.ManufactureDate;
                            string expDate = item.ExpiryDate;

                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                            string decs1 = "";
                            string decs2 = "";
                            string[] t1 = Spliter.spliter(item.ProductDesc, 35);
                            decs1 = t1[0];
                            decs2 = t1[1];
                            int j = 1;

                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\ACL_50mmx25mm.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@Des1", decs1);
                                str = str.Replace("@Des2", decs2);
                                str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                                str = str.Replace("@Qty", item.Quantity);
                                str = str.Replace("@Count", item.NoOfBarcode);

                                str = str.Replace("@Mdf", mnfDate);
                                str = str.Replace("@Exp", expDate);
                                str = str.Replace("@bt", item.BarcodeType);
                                str = str.Replace("@BatchNo", item.BatchNo);
                                if (item.PackingLevelId == "0")
                                {

                                    str = str.Replace("@SeqId", "I-" + (j).ToString());
                                    j++;
                                }
                                string type = item.BarcodeType;
                                if (type == "")
                                {
                                    str = str.Replace("@S", item.BarcodeType);
                                }
                                else
                                {
                                    str = str.Replace("@S", "");
                                }
                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\ACL_50mmx25mm_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\ACL_50mmx25mm_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }

                        ////////////////////////////////////////////////////////////////


                        else if (item.BarcodeTemplateId == "6") // SIZE 50 mm,25 mm TIN NO EXP
                        {
                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                            string decs1 = "";
                            string decs2 = "";
                            int j = 1;
                            //int length = item.ProductDesc.Length;
                            //if (length <= 35)
                            //{
                            //    decs1 = item.ProductDesc;
                            //}
                            //if (length > 35)
                            //{
                            //    decs1 = item.ProductDesc.Substring(0, 35);
                            //    decs2 = item.ProductDesc.Substring(35, (length - 1) - 35);
                            //}
                            string[] t6 = Spliter.spliter(item.ProductDesc, 30);
                            decs1 = t6[0];
                            decs2 = t6[1];

                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mmx25mmWoExp.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@Des1", decs1);
                                str = str.Replace("@Des2", decs2);
                                str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                                str = str.Replace("@Qty", item.Quantity);
                                str = str.Replace("@Count", item.NoOfBarcode);

                                str = str.Replace("@Mdf", item.ManufactureDate);
                                str = str.Replace("@Exp", item.ExpiryDate);
                                str = str.Replace("@bt", item.BarcodeType);
                                str = str.Replace("@BatchNo", item.BatchNo);
                                if (item.PackingLevelId == "0")
                                {

                                    str = str.Replace("@SeqId", "I-" + (j).ToString());
                                    j++;
                                }

                                string type = item.BarcodeType;
                                if (type == "")
                                {
                                    str = str.Replace("@S", item.BarcodeType);
                                }
                                else
                                {
                                    str = str.Replace("@S", "");
                                }
                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mmx25mmWoExp_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\50mmx25mmWoExp_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }

                        else if (item.BarcodeTemplateId == "10") // SIZE 50 mm,25 mm TIN CP
                        {
                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                            string decs1 = "";
                            string decs2 = "";
                            int j = 1;
                            //int length = item.ProductDesc.Length;
                            //if (length <= 35)
                            //{
                            //    decs1 = item.ProductDesc;
                            //}
                            //if (length > 35)
                            //{
                            //    decs1 = item.ProductDesc.Substring(0, 35);
                            //    decs2 = item.ProductDesc.Substring(35, (length - 1) - 35);
                            //}
                            string[] t10 = Spliter.spliter(item.ProductDesc, 30);
                            decs1 = t10[0];
                            decs2 = t10[1];

                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mmx25mmCP.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@Des1", decs1);
                                str = str.Replace("@Des2", decs2);
                                str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                                str = str.Replace("@Qty", item.Quantity);
                                str = str.Replace("@Count", item.NoOfBarcode);

                                str = str.Replace("@Mdf", item.ManufactureDate);
                                str = str.Replace("@Exp", item.ExpiryDate);
                                str = str.Replace("@bt", item.BarcodeType);
                                str = str.Replace("@BatchNo", item.BatchNo);
                                if (item.PackingLevelId == "0")
                                {

                                    str = str.Replace("@SeqId", "I-" + (j).ToString());
                                    j++;
                                }

                                string type = item.BarcodeType;
                                if (type == "")
                                {
                                    str = str.Replace("@S", item.BarcodeType);
                                }
                                else
                                {
                                    str = str.Replace("@S", "");
                                }
                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mmx25mmCP_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\50mmx25mmCP_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }
                        else if (item.BarcodeTemplateId == "25") // SIZE 50 mm,25 mm Vertical Barcode Standard
                        {

                            string mnfDate = item.ManufactureDate;
                            string expDate = item.ExpiryDate;

                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                            string decs1 = "";
                            string decs2 = "";
                            string[] t1 = Spliter.spliter(item.ProductDesc, 35);
                            decs1 = t1[0];
                            decs2 = t1[1];
                            int j = 1;

                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mmx25mmvtl.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@Des1", decs1);
                                str = str.Replace("@Des2", decs2);
                                str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                                str = str.Replace("@Qty", item.Quantity);
                                str = str.Replace("@Count", item.NoOfBarcode);

                                str = str.Replace("@Mdf", mnfDate);
                                str = str.Replace("@Exp", expDate);
                                str = str.Replace("@bt", item.BarcodeType);
                                str = str.Replace("@BatchNo", item.BatchNo);
                                if (item.PackingLevelId == "0")
                                {

                                    str = str.Replace("@SeqId", "I-" + (j).ToString());
                                    j++;
                                }
                                string type = item.BarcodeType;
                                if (type == "")
                                {
                                    str = str.Replace("@S", item.BarcodeType);
                                }
                                else
                                {
                                    str = str.Replace("@S", "");
                                }
                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mmx25mmvtl_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\50mmx25mmvtl_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }

                        #endregion

                        #region 90mmx18mm

                        else if (item.BarcodeTemplateId == "4" || item.BarcodeTemplateId == "21") // SIZE 90 mm,18 mm TIN
                        {
                            string mnfDate = item.ManufactureDate;
                            string expDate = item.ExpiryDate;
                            int j = 1;

                            if (item.BarcodeTemplateId == "21")
                            {
                                DateTime _mfDate = Convert.ToDateTime(mnfDate);
                                DateTime _ExpDate = Convert.ToDateTime(expDate);

                                double selfLife = (_ExpDate - _mfDate).TotalDays;
                                DateTime _newMfDate = new DateTime(2017, _mfDate.Month, _mfDate.Day);
                                DateTime _newExpDate = _newMfDate.AddDays(selfLife);
                                mnfDate = _newMfDate.ToString("yyyy-MM-dd");
                                expDate = _newExpDate.ToString("yyyy-MM-dd");
                            }

                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\90mm18mm.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@Des1", item.ProductDesc);
                                str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                                //str = str.Replace("@Qty", item.Quantity);
                                //str = str.Replace("@Count", item.NoOfBarcode);

                                str = str.Replace("@Mdf", mnfDate);
                                str = str.Replace("@Exp", expDate);
                                str = str.Replace("@bt", item.BarcodeType);
                                str = str.Replace("@BatchNo", item.BatchNo);
                                if (item.PackingLevelId == "0")
                                {

                                    str = str.Replace("@SeqId", "I- " + (j).ToString());
                                    j++;
                                }

                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\90mm18mm_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\90mm18mm_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }
                        ///////////////////////////////////////////////////////

                        else if (item.BarcodeTemplateId == "33" ) // SIZE 90 mm,18 mm TIN
                        {
                            string mnfDate = item.ManufactureDate;
                            string expDate = item.ExpiryDate;
                            int j = 1;

                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\ACL_90mmx18mm.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@Des1", item.ProductDesc);
                                str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                                //str = str.Replace("@Qty", item.Quantity);
                                //str = str.Replace("@Count", item.NoOfBarcode);

                                str = str.Replace("@Mdf", mnfDate);
                                str = str.Replace("@Exp", expDate);
                                str = str.Replace("@bt", item.BarcodeType);
                                str = str.Replace("@BatchNo", item.BatchNo);
                                if (item.PackingLevelId == "0")
                                {

                                    str = str.Replace("@SeqId", "I- " + (j).ToString());
                                    j++;
                                }

                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\ACL_90mmx18mm_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\ACL_90mmx18mm_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }

                        ///////////////////////////////////////////////////////
                        else if (item.BarcodeTemplateId == "9") // SIZE 90 mm,18 mm TIN No Exp
                        {
                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                            int j = 1;
                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\90mmx18mmWoExp.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@Des1", item.ProductDesc);
                                //str = str.Replace("@Des2", decs2);
                                str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                                //str = str.Replace("@Qty", item.Quantity);
                                //str = str.Replace("@Count", item.NoOfBarcode);

                                str = str.Replace("@Mdf", item.ManufactureDate);
                                str = str.Replace("@Exp", item.ExpiryDate);
                                str = str.Replace("@bt", item.BarcodeType);
                                str = str.Replace("@BatchNo", item.BatchNo);
                                if (item.PackingLevelId == "0")
                                {

                                    str = str.Replace("@SeqId", "I- " + (j).ToString());
                                    j++;
                                }

                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\90mmx18mmWoExp_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\90mmx18mmWoExp_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }

                        else if (item.BarcodeTemplateId == "11") // SIZE 90 mm,18 mm TIN CP
                        {
                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                            int j = 1;

                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\90mmx18mmCP.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@Des1", item.ProductDesc);
                                str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                                str = str.Replace("@Mdf", item.ManufactureDate);
                                str = str.Replace("@Exp", item.ExpiryDate);
                                str = str.Replace("@bt", item.BarcodeType);
                                str = str.Replace("@BatchNo", item.BatchNo);
                                if (item.PackingLevelId == "0")
                                {

                                    str = str.Replace("@SeqId", "I- " + (j).ToString());
                                    j++;
                                }

                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\90mmx18mmCP_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\90mmx18mmCP_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }
                        #endregion

                        #region 75 mm,100 mm BOX Pallet

                        else if (item.BarcodeTemplateId == "2" || item.BarcodeTemplateId == "19") // 75 mm,100 mm BOX
                        {
                            string mnfDate = item.ManufactureDate;
                            string expDate = item.ExpiryDate;

                            if (item.BarcodeTemplateId == "19")
                            {
                                DateTime _mfDate = Convert.ToDateTime(mnfDate);
                                DateTime _ExpDate = Convert.ToDateTime(expDate);

                                double selfLife = (_ExpDate - _mfDate).TotalDays;
                                DateTime _newMfDate = new DateTime(2017, _mfDate.Month, _mfDate.Day);
                                DateTime _newExpDate = _newMfDate.AddDays(selfLife);
                                mnfDate = _newMfDate.ToString("yyyy-MM-dd");
                                expDate = _newExpDate.ToString("yyyy-MM-dd");
                            }
                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                            string decs1 = "";
                            string decs2 = "";
                            string decs3 = "";


                            string[] t2 = Spliter.spliter(item.ProductDesc, 30);
                            decs1 = t2[0];
                            decs2 = t2[1];
                            decs3 = t2[2];
                            int j = 1;

                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\75mm100mm.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@Des1", decs1);
                                str = str.Replace("@Des2", decs2);
                                str = str.Replace("@Des3", decs3);
                                str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00")); // Convert.ToDecimal(item.SellingPrice).ToString("0.00")
                                str = str.Replace("@Qty", item.Quantity);

                                str = str.Replace("@Mdf", mnfDate);
                                str = str.Replace("@Exp", expDate);
                                str = str.Replace("@bt", item.BarcodeType);
                                str = str.Replace("@BatchNo", item.BatchNo);
                                if (item.PackingLevelId == "0")
                                {

                                    str = str.Replace("@SeqId", "I- " + (j).ToString());
                                    j++;
                                }
                                else if (item.PackingLevelId == "1")
                                {
                                    str = str.Replace("@SeqId", "B- " + item.SeqId);
                                }
                                else
                                {
                                    str = str.Replace("@SeqId", "P- " + item.SeqId);
                                }

                                string type = item.BarcodeType;
                                if (type == "")
                                {
                                    str = str.Replace("@S", item.BarcodeType);
                                }
                                else
                                {
                                    str = str.Replace("@S", "");
                                }
                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\75mm100mm_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\75mm100mm_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }
                        ////////////////////////////////

                        else if (item.BarcodeTemplateId == "34") // 75 mm,100 mm BOX --- 35>>>34
                        {
                            string mnfDate = item.ManufactureDate;
                            string expDate = item.ExpiryDate;
                            
                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                            string decs1 = "";
                            string decs2 = "";
                            string decs3 = "";


                            string[] t2 = Spliter.spliter(item.ProductDesc, 30);
                            decs1 = t2[0];
                            decs2 = t2[1];
                            decs3 = t2[2];
                            int j = 1;

                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\ACL_100mmx75mm.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@Des1", decs1);
                                str = str.Replace("@Des2", decs2);
                                str = str.Replace("@Des3", decs3);
                                str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00")); // Convert.ToDecimal(item.SellingPrice).ToString("0.00")
                                str = str.Replace("@Qty", item.Quantity);

                                str = str.Replace("@Mdf", mnfDate);
                                str = str.Replace("@Exp", expDate);
                                str = str.Replace("@bt", item.BarcodeType);
                                str = str.Replace("@BatchNo", item.BatchNo);
                                if (item.PackingLevelId == "0")
                                {

                                    str = str.Replace("@SeqId", "I- " + (j).ToString());
                                    j++;
                                }
                                else if (item.PackingLevelId == "1")
                                {
                                    str = str.Replace("@SeqId", "B- " + item.SeqId);
                                }
                                else
                                {
                                    str = str.Replace("@SeqId", "P- " + item.SeqId);
                                }

                                string type = item.BarcodeType;
                                if (type == "")
                                {
                                    str = str.Replace("@S", item.BarcodeType);
                                }
                                else
                                {
                                    str = str.Replace("@S", "");
                                }
                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\ACL_100mmx75mm_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\ACL_100mmx75mm_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }

                        ////////////////////////////////////////////

                        else if (item.BarcodeTemplateId == "3" || item.BarcodeTemplateId == "20") // 75 mm,100 mm PALLET
                        {
                            string mnfDate = item.ManufactureDate;
                            string expDate = item.ExpiryDate;

                            if (item.BarcodeTemplateId == "20")
                            {
                                DateTime _mfDate = Convert.ToDateTime(mnfDate);
                                DateTime _ExpDate = Convert.ToDateTime(expDate);

                                double selfLife = (_ExpDate - _mfDate).TotalDays;
                                DateTime _newMfDate = new DateTime(2017, _mfDate.Month, _mfDate.Day);
                                DateTime _newExpDate = _newMfDate.AddDays(selfLife);
                                mnfDate = _newMfDate.ToString("yyyy-MM-dd");
                                expDate = _newExpDate.ToString("yyyy-MM-dd");
                            }

                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                            string decs1 = "";
                            string decs2 = "";
                            string decs3 = "";
                            string[] t3 = Spliter.spliter(item.ProductDesc, 30);
                            decs1 = t3[0];
                            decs2 = t3[1];
                            decs3 = t3[2];
                            int j = 1;

                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\75mm100mm.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@Des1", decs1);
                                str = str.Replace("@Des2", decs2);
                                str = str.Replace("@Des3", decs3);
                                str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                                str = str.Replace("@Qty", item.Quantity);
                                str = str.Replace("@Mdf", mnfDate);
                                str = str.Replace("@Exp", expDate);
                                str = str.Replace("@bt", item.BarcodeType);
                                str = str.Replace("@BatchNo", item.BatchNo);
                                if (item.PackingLevelId == "0")
                                {

                                    str = str.Replace("@SeqId", "I- " + (j).ToString());
                                    j++;
                                }
                                else if (item.PackingLevelId == "1")
                                {
                                    str = str.Replace("@SeqId", "B- " + item.SeqId);
                                }
                                else
                                {
                                    str = str.Replace("@SeqId", "P- " + item.SeqId);
                                }

                                string type = item.BarcodeType;
                                if (type == "")
                                {
                                    str = str.Replace("@S", item.BarcodeType);
                                }
                                else
                                {
                                    str = str.Replace("@S", "");
                                }
                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\75mm100mm_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\75mm100mm_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }

                        //////////////////////////////////////////

                        else if (item.BarcodeTemplateId == "36" ) // 75 mm,100 mm PALLET
                        {
                            string mnfDate = item.ManufactureDate;
                            string expDate = item.ExpiryDate;

                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                            string decs1 = "";
                            string decs2 = "";
                            string decs3 = "";
                            string[] t3 = Spliter.spliter(item.ProductDesc, 30);
                            decs1 = t3[0];
                            decs2 = t3[1];
                            decs3 = t3[2];
                            int j = 1;

                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\ACL_100mmx75mm.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@Des1", decs1);
                                str = str.Replace("@Des2", decs2);
                                str = str.Replace("@Des3", decs3);
                                str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                                str = str.Replace("@Qty", item.Quantity);
                                str = str.Replace("@Mdf", mnfDate);
                                str = str.Replace("@Exp", expDate);
                                str = str.Replace("@bt", item.BarcodeType);
                                str = str.Replace("@BatchNo", item.BatchNo);
                                if (item.PackingLevelId == "0")
                                {

                                    str = str.Replace("@SeqId", "I- " + (j).ToString());
                                    j++;
                                }
                                else if (item.PackingLevelId == "1")
                                {
                                    str = str.Replace("@SeqId", "B- " + item.SeqId);
                                }
                                else
                                {
                                    str = str.Replace("@SeqId", "P- " + item.SeqId);
                                }

                                string type = item.BarcodeType;
                                if (type == "")
                                {
                                    str = str.Replace("@S", item.BarcodeType);
                                }
                                else
                                {
                                    str = str.Replace("@S", "");
                                }
                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\ACL_100mmx75mm_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\ACL_100mmx75mm_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }

                        /////////////////////////////////////////////

                        else if (item.BarcodeTemplateId == "8") // 75 mm,100 mm BOX No Exp
                        {
                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);

                            string decs1 = "";
                            string decs2 = "";
                            string decs3 = "";
                            //int length = item.ProductDesc.Length;
                            //if (length <= 30)
                            //{
                            //    decs1 = item.ProductDesc;
                            //}
                            //if (length > 30 && length <= 60)
                            //{
                            //    decs1 = item.ProductDesc.Substring(0, 30);
                            //    decs2 = item.ProductDesc.Substring(30, (length - 1) - 30);
                            //}
                            //if (length > 60)
                            //{
                            //    decs1 = item.ProductDesc.Substring(0, 30);
                            //    decs2 = item.ProductDesc.Substring(30, 30);
                            //    decs3 = item.ProductDesc.Substring(60, (length - 1) - 60);
                            //}

                            string[] t8 = Spliter.spliter(item.ProductDesc, 30);
                            decs1 = t8[0];
                            decs2 = t8[1];
                            decs3 = t8[2];
                            int j = 1;

                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmWoExp.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@Des1", decs1);
                                str = str.Replace("@Des2", decs2);
                                str = str.Replace("@Des3", decs3);
                                str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                                str = str.Replace("@Qty", item.Quantity);

                                str = str.Replace("@Mdf", item.ManufactureDate);
                                str = str.Replace("@Exp", item.ExpiryDate);
                                str = str.Replace("@bt", item.BarcodeType);
                                str = str.Replace("@BatchNo", item.BatchNo);
                                if (item.PackingLevelId == "0")
                                {

                                    str = str.Replace("@SeqId", "I- " + (j).ToString());
                                    j++;
                                }
                                else if (item.PackingLevelId == "1")
                                {
                                    str = str.Replace("@SeqId", "B- " + item.SeqId);
                                }
                                else
                                {
                                    str = str.Replace("@SeqId", "P- " + item.SeqId);
                                }

                                string type = item.BarcodeType;
                                if (type == "")
                                {
                                    str = str.Replace("@S", item.BarcodeType);
                                }
                                else
                                {
                                    str = str.Replace("@S", "");
                                }
                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmWoExp_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmWoExp_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }

                        else if (item.BarcodeTemplateId == "14") // 75 mm,100 mm BOX No Exp
                        {
                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);

                            string decs1 = "";
                            string decs2 = "";
                            string decs3 = "";
                            //int length = item.ProductDesc.Length;
                            //if (length <= 30)
                            //{
                            //    decs1 = item.ProductDesc;
                            //}
                            //if (length > 30 && length <= 60)
                            //{
                            //    decs1 = item.ProductDesc.Substring(0, 30);
                            //    decs2 = item.ProductDesc.Substring(30, (length - 1) - 30);
                            //}
                            //if (length > 60)
                            //{
                            //    decs1 = item.ProductDesc.Substring(0, 30);
                            //    decs2 = item.ProductDesc.Substring(30, 30);
                            //    decs3 = item.ProductDesc.Substring(60, (length - 1) - 60);
                            //}

                            string[] t14 = Spliter.spliter(item.ProductDesc, 30);
                            decs1 = t14[0];
                            decs2 = t14[1];
                            decs3 = t14[2];
                            int j = 1;

                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmWoExp.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@Des1", decs1);
                                str = str.Replace("@Des2", decs2);
                                str = str.Replace("@Des3", decs3);
                                str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                                str = str.Replace("@Qty", item.Quantity);

                                str = str.Replace("@Mdf", item.ManufactureDate);
                                str = str.Replace("@Exp", item.ExpiryDate);
                                str = str.Replace("@bt", item.BarcodeType);
                                str = str.Replace("@BatchNo", item.BatchNo);
                                if (item.PackingLevelId == "0")
                                {

                                    str = str.Replace("@SeqId", "I- " + (j).ToString());
                                    j++;
                                }
                                else if (item.PackingLevelId == "1")
                                {
                                    str = str.Replace("@SeqId", "B- " + item.SeqId);
                                }
                                else
                                {
                                    str = str.Replace("@SeqId", "P- " + item.SeqId);
                                }

                                string type = item.BarcodeType;
                                if (type == "")
                                {
                                    str = str.Replace("@S", item.BarcodeType);
                                }
                                else
                                {
                                    str = str.Replace("@S", "");
                                }
                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmWoExp_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmWoExp_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }

                        else if (item.BarcodeTemplateId == "12") // 75 mm,100 mm BOX No Exp
                        {
                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);

                            string decs1 = "";
                            string decs2 = "";
                            string decs3 = "";
                            //int length = item.ProductDesc.Length;
                            //if (length <= 30)
                            //{
                            //    decs1 = item.ProductDesc;
                            //}
                            //if (length > 30 && length <= 60)
                            //{
                            //    decs1 = item.ProductDesc.Substring(0, 30);
                            //    decs2 = item.ProductDesc.Substring(30, (length - 1) - 30);
                            //}
                            //if (length > 60)
                            //{
                            //    decs1 = item.ProductDesc.Substring(0, 30);
                            //    decs2 = item.ProductDesc.Substring(30, 30);
                            //    decs3 = item.ProductDesc.Substring(60, (length - 1) - 60);
                            //}

                            string[] t12 = Spliter.spliter(item.ProductDesc, 30);
                            decs1 = t12[0];
                            decs2 = t12[1];
                            decs3 = t12[2];
                            int j = 1;

                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmCP.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@Des1", decs1);
                                str = str.Replace("@Des2", decs2);
                                str = str.Replace("@Des3", decs3);
                                str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                                str = str.Replace("@Qty", item.Quantity);

                                str = str.Replace("@Mdf", item.ManufactureDate);
                                str = str.Replace("@Exp", item.ExpiryDate);
                                str = str.Replace("@bt", item.BarcodeType);
                                str = str.Replace("@BatchNo", item.BatchNo);
                                if (item.PackingLevelId == "0")
                                {

                                    str = str.Replace("@SeqId", "I- " + (j).ToString());
                                    j++;
                                }
                                else if (item.PackingLevelId == "1")
                                {
                                    str = str.Replace("@SeqId", "B- " + item.SeqId);
                                }
                                else
                                {
                                    str = str.Replace("@SeqId", "P- " + item.SeqId);
                                }

                                string type = item.BarcodeType;
                                if (type == "")
                                {
                                    str = str.Replace("@S", item.BarcodeType);
                                }
                                else
                                {
                                    str = str.Replace("@S", "");
                                }
                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmCP_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmCP_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }

                        else if (item.BarcodeTemplateId == "13") // 75 mm,100 mm Pallet No Exp
                        {
                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);

                            string decs1 = "";
                            string decs2 = "";
                            string decs3 = "";
                            //int length = item.ProductDesc.Length;
                            //if (length <= 30)
                            //{
                            //    decs1 = item.ProductDesc;
                            //}
                            //if (length > 30 && length <= 60)
                            //{
                            //    decs1 = item.ProductDesc.Substring(0, 30);
                            //    decs2 = item.ProductDesc.Substring(30, (length - 1) - 30);
                            //}
                            //if (length > 60)
                            //{
                            //    decs1 = item.ProductDesc.Substring(0, 30);
                            //    decs2 = item.ProductDesc.Substring(30, 30);
                            //    decs3 = item.ProductDesc.Substring(60, (length - 1) - 60);
                            //}
                            string[] t13 = Spliter.spliter(item.ProductDesc, 30);
                            decs1 = t13[0];
                            decs2 = t13[1];
                            decs3 = t13[2];
                            int j = 1;

                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmCP.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@Des1", decs1);
                                str = str.Replace("@Des2", decs2);
                                str = str.Replace("@Des3", decs3);
                                str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                                str = str.Replace("@Qty", item.Quantity);

                                str = str.Replace("@Mdf", item.ManufactureDate);
                                str = str.Replace("@Exp", item.ExpiryDate);
                                str = str.Replace("@bt", item.BarcodeType);
                                str = str.Replace("@BatchNo", item.BatchNo);
                                if (item.PackingLevelId == "0")
                                {

                                    str = str.Replace("@SeqId", "I- " + (j).ToString());
                                    j++;
                                }
                                else if (item.PackingLevelId == "1")
                                {
                                    str = str.Replace("@SeqId", "B- " + item.SeqId);
                                }
                                else
                                {
                                    str = str.Replace("@SeqId", "P- " + item.SeqId);
                                }

                                string type = item.BarcodeType;
                                if (type == "")
                                {
                                    str = str.Replace("@S", item.BarcodeType);
                                }
                                else
                                {
                                    str = str.Replace("@S", "");
                                }
                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmCP_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmCP_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }


                        #endregion

                        #region 100mmx75mm Item

                        else if (item.BarcodeTemplateId == "7" || item.BarcodeTemplateId == "22") // 75 mm,100 mm Item
                        {
                            string mnfDate = item.ManufactureDate;
                            string expDate = item.ExpiryDate;

                            if (item.BarcodeTemplateId == "22")
                            {
                                DateTime _mfDate = Convert.ToDateTime(mnfDate);
                                DateTime _ExpDate = Convert.ToDateTime(expDate);

                                double selfLife = (_ExpDate - _mfDate).TotalDays;
                                DateTime _newMfDate = new DateTime(2017, _mfDate.Month, _mfDate.Day);
                                DateTime _newExpDate = _newMfDate.AddDays(selfLife);
                                mnfDate = _newMfDate.ToString("yyyy-MM-dd");
                                expDate = _newExpDate.ToString("yyyy-MM-dd");
                            }

                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                            string decs1 = "";
                            string decs2 = "";
                            string decs3 = "";
                            string[] t7 = Spliter.spliter(item.ProductDesc, 30);
                            decs1 = t7[0];
                            decs2 = t7[1];
                            decs3 = t7[2];
                            int j = 1;

                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmItem.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@Des1", decs1);
                                str = str.Replace("@Des2", decs2);
                                str = str.Replace("@Des3", decs3);
                                str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                                str = str.Replace("@Qty", item.Quantity);

                                str = str.Replace("@Mdf", mnfDate);
                                str = str.Replace("@Exp", expDate);
                                str = str.Replace("@bt", item.BarcodeType);
                                str = str.Replace("@BatchNo", item.BatchNo);
                                if (item.PackingLevelId == "0")
                                {

                                    str = str.Replace("@SeqId", "I- " + (j).ToString());
                                    j++;
                                }
                                else if (item.PackingLevelId == "1")
                                {
                                    str = str.Replace("@SeqId", "B- " + item.SeqId);
                                }
                                else
                                {
                                    str = str.Replace("@SeqId", "P- " + item.SeqId);
                                }

                                string type = item.BarcodeType;
                                if (type == "")
                                {
                                    str = str.Replace("@S", item.BarcodeType);
                                }
                                else
                                {
                                    str = str.Replace("@S", "");
                                }

                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmItem_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmItem_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);

                                i++;
                            }
                        }

                        else if (item.BarcodeTemplateId == "35" ) // 75 mm,100 mm Item - 34 >> 35
                        {
                            string mnfDate = item.ManufactureDate;
                            string expDate = item.ExpiryDate;

                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                            string decs1 = "";
                            string decs2 = "";
                            string decs3 = "";
                            string[] t7 = Spliter.spliter(item.ProductDesc, 30);
                            decs1 = t7[0];
                            decs2 = t7[1];
                            decs3 = t7[2];
                            int j = 1;

                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\ACL_100mmx75mmItem.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@Des1", decs1);
                                str = str.Replace("@Des2", decs2);
                                str = str.Replace("@Des3", decs3);
                                str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                                str = str.Replace("@Qty", item.Quantity);

                                str = str.Replace("@Mdf", mnfDate);
                                str = str.Replace("@Exp", expDate);
                                str = str.Replace("@bt", item.BarcodeType);
                                str = str.Replace("@BatchNo", item.BatchNo);
                                if (item.PackingLevelId == "0")
                                {

                                    str = str.Replace("@SeqId", "I- " + (j).ToString());
                                    j++;
                                }
                                else if (item.PackingLevelId == "1")
                                {
                                    str = str.Replace("@SeqId", "B- " + item.SeqId);
                                }
                                else
                                {
                                    str = str.Replace("@SeqId", "P- " + item.SeqId);
                                }

                                string type = item.BarcodeType;
                                if (type == "")
                                {
                                    str = str.Replace("@S", item.BarcodeType);
                                }
                                else
                                {
                                    str = str.Replace("@S", "");
                                }

                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\ACL_100mmx75mmItem_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\ACL_100mmx75mmItem_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);

                                i++;
                            }
                        }

                        else if (item.BarcodeTemplateId == "15") // 75 mm,100 mm Item
                        {
                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                            string decs1 = "";
                            string decs2 = "";
                            string decs3 = "";
                            //int length = item.ProductDesc.Length;
                            //if (length <= 30)
                            //{
                            //    decs1 = item.ProductDesc;
                            //}
                            //if (length > 30 && length <= 60)
                            //{
                            //    decs1 = item.ProductDesc.Substring(0, 30);
                            //    decs2 = item.ProductDesc.Substring(30, (length - 1) - 30);
                            //}
                            //if (length > 60)
                            //{
                            //    decs1 = item.ProductDesc.Substring(0, 30);
                            //    decs2 = item.ProductDesc.Substring(30, 30);
                            //    decs3 = item.ProductDesc.Substring(60, (length - 1) - 60);
                            //}

                            string[] t15 = Spliter.spliter(item.ProductDesc, 30);
                            decs1 = t15[0];
                            decs2 = t15[1];
                            decs3 = t15[2];
                            int j = 1;

                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmItemWoExp.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@Des1", decs1);
                                str = str.Replace("@Des2", decs2);
                                str = str.Replace("@Des3", decs3);
                                str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                                str = str.Replace("@Qty", item.Quantity);

                                str = str.Replace("@Mdf", item.ManufactureDate);
                                str = str.Replace("@Exp", item.ExpiryDate);
                                str = str.Replace("@bt", item.BarcodeType);
                                str = str.Replace("@BatchNo", item.BatchNo);
                                if (item.PackingLevelId == "0")
                                {

                                    str = str.Replace("@SeqId", "I- " + (j).ToString());
                                    j++;
                                }
                                else if (item.PackingLevelId == "1")
                                {
                                    str = str.Replace("@SeqId", "B- " + item.SeqId);
                                }
                                else
                                {
                                    str = str.Replace("@SeqId", "P- " + item.SeqId);
                                }

                                string type = item.BarcodeType;
                                if (type == "")
                                {
                                    str = str.Replace("@S", item.BarcodeType);
                                }
                                else
                                {
                                    str = str.Replace("@S", "");
                                }
                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmItemWoExp_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmItemWoExp_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }

                        else if (item.BarcodeTemplateId == "16") // 75 mm,100 mm Item
                        {
                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                            string decs1 = "";
                            string decs2 = "";
                            string decs3 = "";
                            //int length = item.ProductDesc.Length;
                            //if (length <= 30)
                            //{
                            //    decs1 = item.ProductDesc;
                            //}
                            //if (length > 30 && length <= 60)
                            //{
                            //    decs1 = item.ProductDesc.Substring(0, 30);
                            //    decs2 = item.ProductDesc.Substring(30, (length - 1) - 30);
                            //}
                            //if (length > 60)
                            //{
                            //    decs1 = item.ProductDesc.Substring(0, 30);
                            //    decs2 = item.ProductDesc.Substring(30, 30);
                            //    decs3 = item.ProductDesc.Substring(60, (length - 1) - 60);
                            //}

                            string[] t16 = Spliter.spliter(item.ProductDesc, 30);
                            decs1 = t16[0];
                            decs2 = t16[1];
                            decs3 = t16[2];
                            int j = 1;

                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmItemCP.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@Des1", decs1);
                                str = str.Replace("@Des2", decs2);
                                str = str.Replace("@Des3", decs3);
                                str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                                str = str.Replace("@Qty", item.Quantity);

                                str = str.Replace("@Mdf", item.ManufactureDate);
                                str = str.Replace("@Exp", item.ExpiryDate);
                                str = str.Replace("@bt", item.BarcodeType);
                                str = str.Replace("@BatchNo", item.BatchNo);
                                if (item.PackingLevelId == "0")
                                {

                                    str = str.Replace("@SeqId", "I- " + (j).ToString());
                                    j++;
                                }
                                else if (item.PackingLevelId == "1")
                                {
                                    str = str.Replace("@SeqId", "B- " + item.SeqId);
                                }
                                else
                                {
                                    str = str.Replace("@SeqId", "P- " + item.SeqId);
                                }

                                string type = item.BarcodeType;
                                if (type == "")
                                {
                                    str = str.Replace("@S", item.BarcodeType);
                                }
                                else
                                {
                                    str = str.Replace("@S", "");
                                }
                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmItemCP_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\100mmx75mmItemCP_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }
                        #endregion

                        #region 50mmx15mm

                        else if (item.BarcodeTemplateId == "5") // SIZE 50 mm,15 mm TIN
                        {
                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                            int j = 1;
                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mm15mm.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                                str = str.Replace("@Mdf", item.ManufactureDate);
                                str = str.Replace("@BatchNo", item.BatchNo);
                                str = str.Replace("@bt", item.BarcodeType);
                                str = str.Replace("@Count", item.NoOfBarcode);
                                if (item.PackingLevelId == "0")
                                {

                                    str = str.Replace("@SeqId", "I-" + (j).ToString());
                                    j++;
                                }
                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mm15mm_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\50mm15mm_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }
                        else if (item.BarcodeTemplateId == "23") // SIZE 50 mm,15 mm TIN
                        {
                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);

                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mm15mmST.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                                str = str.Replace("@Exp", item.ExpiryDate);
                                str = str.Replace("@Mfd", item.ManufactureDate);
                                str = str.Replace("@BatchNo", item.BatchNo);
                                str = str.Replace("@bt", item.BarcodeType);
                                str = str.Replace("@Count", item.NoOfBarcode);
                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mm15mmST_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\50mm15mmST_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }
                        else if (item.BarcodeTemplateId == "17") // SIZE 50 mm,15 mm TIN for Adj
                        {
                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);

                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mm15mmAd.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@BatchNo", item.BatchNo);
                                str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                                str = str.Replace("@Mdf", item.ManufactureDate);
                                str = str.Replace("@Count", item.NoOfBarcode);
                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\50mm15mmAd_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\50mm15mmAd_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }

                        #endregion
                        
                        #region NTH
                        /*93793 - NTM*/
                        else if (item.BarcodeTemplateId == "24") // SIZE 50 mm,15 mm TIN
                        {
                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                            string decs1 = "";
                            string decs2 = "";
                            string decs3 = "";

                            string[] t15 = Spliter.spliter(item.ProductDesc, 30);
                            decs1 = t15[0];
                            decs2 = t15[1];
                            decs3 = t15[2];
                            int j = 1;
                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\ntm.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ItemCode", item.ProductCode);
                                str = str.Replace("@Des1", decs1);
                                str = str.Replace("@Des2", decs2);
                                str = str.Replace("@Des3", decs3);
                                //str = str.Replace("@Price", Convert.ToDecimal(item.SellingPrice).ToString("0.00"));
                                //str = str.Replace("@Qty", item.Quantity);

                                //str = str.Replace("@Mdf", item.ManufactureDate);
                                //str = str.Replace("@Exp", item.ExpiryDate);
                                //str = str.Replace("@bt", item.BarcodeType);
                                //str = str.Replace("@BatchNo", item.BatchNo);
                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\ntm_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\ntm_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }

                        /*End Ntm*/

                        #endregion

                        /* Nelna */
                        else if (item.BarcodeTemplateId == "28") // SIZE 50 mm,25 mm TIN NO EXP
                        {
                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode); 

                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\25inx25inNelna.txt", Encoding.Default);
                                str = str.Replace("@LoadingPoint", item.LoadingPoint);
                                str = str.Replace("@Reprecentative", item.Reprecentative);
                                str = str.Replace("@ItemDetails", item.ItemDetails);
                                str = str.Replace("@SerialNo", item.SerialNo);
                                str = str.Replace("@GrossWeight", item.GrossWeight);
                                str = str.Replace("@ContainerWeight", item.ContainerWeight);
                                str = str.Replace("@NetWeight", item.NetWeight);
                                str = str.Replace("@LoadingDate", item.LoadingDate);
                                str = str.Replace("@LoadingTime", item.LoadingTime);

                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\25inx25inNelna_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\25inx25inNelna_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }

                        else if (item.BarcodeTemplateId == "29") // Demo - Template
                        {
                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);

                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\Demo_2023_03_22_br.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                str = str.Replace("@ProductCode",item.ProductCode );
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\Demo_2023_03_22_br_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\Demo_2023_03_22_br_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }
                        else if (item.BarcodeTemplateId == "30") // Demo - Template
                        {
                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);

                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\Demo_2023_03_22_qr.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\Demo_2023_03_22_qr_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\Demo_2023_03_22_qr_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }


                        #region Pick List
                        else
                        {
                            int i = 0;
                            int noOfBarcode = Convert.ToInt32(item.NoOfBarcode);
                            while (noOfBarcode > i)
                            {
                                string destinationFile = @"\\localhost\" + printer;
                                string str = File.ReadAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\PickList100mm75mm.txt", Encoding.Default);
                                str = str.Replace("@Barcode", item.BarcodeNo);
                                string s1 = str;
                                System.IO.File.WriteAllText(@"C:\BileetaBarcode\BarcodeTemplate\Source\PickList100mm75mm_Temp.txt", str, Encoding.Default);
                                string sourceFile = @"C:\BileetaBarcode\BarcodeTemplate\Source\PickList100mm75mm_Temp.txt";
                                File.Copy(sourceFile, destinationFile, true);
                                Thread.Sleep(100);
                                i++;
                            }
                        }
                        #endregion

                        
                    }
                }
                

                return true;
            }
            #region Catch
            catch (Exception ex)
            {
                throw new Exception("Printer not respond.123..!" + ex.Message);
            }
            #endregion
        }

        [HttpGet]
        public string GetWeight()
        {
            try
            {
                Thread.Sleep(500);
                SerialPort port1 = new SerialPort("COM5",9600, Parity.None, 8, StopBits.Two);   
                            
                port1.Open();               
                string readLine = port1.ReadLine();              
                port1.Close();
                return readLine;
               
            }
            catch(Exception ex)
            {
                throw new Exception("Get Weight Error" + ex.Message);
            }
        }
    }

    public class BarcodeTemplate
    {
        public string ProductCode { get; set; }
        public string ProductDesc { get; set; }
        public string BarcodeNo { get; set; }
        public string ManufactureDate { get; set; }
        public string ExpiryDate { get; set; }
        public string SellingPrice { get; set; }
        public string Quantity { get; set; }
        public string PackingLevelId { get; set; }
        public string BarcodeTemplateId { get; set; }
        public string NoOfBarcode { get; set; }
        public string BarcodeType { get; set; }
        public string BatchNo { get; set; }
        public string SeqId { get; set; }
        public string PluCode { get; set; }
        public string DocNo { get; set; }
        public int OrgId { get; set; }
        public string OrgName { get; set; }
        public string OrgAddress { get; set; }
        public string CompanyName { get; set; }
        public string PostDate { get; set; }
        public string Temp_TemplateId { get; set; }

        public string LoadingPoint { get; set; }
        public string Reprecentative { get; set; }
        public string ItemDetails { get; set; }
        public string SerialNo { get; set; }
        public string GrossWeight { get; set; }
        public string ContainerWeight { get; set; }
        public string NetWeight { get; set; }
        public string LoadingDate { get; set; }
        public string LoadingTime { get; set; }

    }

}