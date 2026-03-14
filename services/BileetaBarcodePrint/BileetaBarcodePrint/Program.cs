using BileetaBarcodePrint;
using System;
using System.Collections.Generic;
using System.Linq;
using System.ServiceProcess;
using System.Text;
using System.Threading.Tasks;
using System.Web.Http.SelfHost;

namespace TestPrint
{
    static class Program
    {
        /// <summary>
        /// The main entry point for the application.
        /// </summary>
        static void Main()
        {
            ServiceBase[] ServicesToRun;
            SelfHostService _selfHostService = new SelfHostService();
            _selfHostService.ServiceName = "API1";
            ServicesToRun = new ServiceBase[] 
            { 
                _selfHostService
            };
            ServiceBase.Run(ServicesToRun);
        }
    }
}
