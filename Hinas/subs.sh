#!/bin/bash
export LANG=en_US.UTF-8
#######################################

# 获取服务状态

SERVICE_NAME="subs"
status=$(systemctl is-active --quiet $SERVICE_NAME; echo $?)


INSTALL_PATH="/etc/zhinan"
#判断文件夹是否存在
if [ -e $INSTALL_PATH ]; then
    echo "${green}文件夹已存在${re}\r\n"
else
    sudo -u root mkdir $INSTALL_PATH
fi



# check if unzip is installed
if ! command -v unzip >/dev/null 2>&1; then
  echo -e "\r\n${red}Error: unzip is not installed${re}\r\n"
  exit 1
fi

# check if curl is installed
if ! command -v curl >/dev/null 2>&1; then
  echo -e "\r\n${red}Error: curl is not installed${re}\r\n"
  exit 1
fi

# Get platform
if command -v arch >/dev/null 2>&1; then
  platform=$(arch)
else
  platform=$(uname -m)
fi

case "$platform" in
  amd64 | x86_64)
    ARCH="x86_64"
    ;;
  arm64 | aarch64 | *armv8*)
    ARCH="aarch64"
    ;;
  *armv7*)
    ARCH="armv7"
    ;;
  *arm*)
    ARCH="arm"
    ;;
  mips)
    ARCH="mips"
    ;;
  mipsel)
    ARCH="mipsel"
    ;;
  *)
    ARCH="UNKNOWN"
    ;;
esac

# support hf
# if [[ "$ARCH" == "armv7" || "$ARCH" == "arm" ]]; then
#   if cat /proc/cpuinfo | grep Features | grep -i 'half' >/dev/null 2>&1; then
#     ARCH=${ARCH}hf
#   fi
# fi

echo -e "\r\n${green}Your platform: ${ARCH} (${platform}) ${re}\r\n" 1>&2

GH_PROXY='https://ghfast.top/'

  # Get version number
  RESPONSE=$(curl -s "https://api.github.com/repos/beck-8/subs-check/releases/latest")
  LATEST_VERSION=$(echo "$RESPONSE" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
  LATEST_VERSION=$(echo -e "$LATEST_VERSION" | tr -d '[:space:]')

  if [ -z "$LATEST_VERSION" ]; then
    echo -e "\r\n${red}Opus${re}, failure to get latest version. Check your internel\r\nOr try ${green}install by band${re}\r\n"
    exit 1
  fi

  # Download
  echo -e "\r\n${green}Downloading Subs-check $LATEST_VERSION ...${re}"
  rm -rf /tmp/sub-check_tmp_install.tar.gz
  Download_url=${GH_PROXY}'https://github.com/beck-8/subs-check/releases/download/'${LATEST_VERSION}'/subs-check_linux_'${ARCH}'.tar.gz'
  echo -e "\r\n${green}Download_url....${Download_url}"
  curl -L ${Download_url} -o /tmp/sub-check_tmp_install.tar.gz $CURL_BAR
  
  # Unzip resource
  echo -e "\r\n${green}Unzip resource ...${re}"
  tar -zxvf /tmp/sub-check_tmp_install.tar.gz -C $INSTALL_PATH/
 # unzip -o /tmp/sub-check_tmp_install.tar.gz -d $INSTALL_PATH/
 mkdir $INSTALL_PATH/config
  #下载配置文件
  curl -L ${GH_PROXY}https://raw.githubusercontent.com/billy74/soft_code/refs/heads/main/Hinas/config.yaml -o $INSTALL_PATH/config/config.yaml
  mv $INSTALL_PATH/subs-check $INSTALL_PATH/subs
 # rm -rf $INSTALL_PATH/subs-check_linux-${ARCH}/
  chmod +x $INSTALL_PATH/subs
  chmod +x $INSTALL_PATH/config/config.yaml
  if [ -f $INSTALL_PATH/subs ]; then
    echo -e "${green} Download successfully! ${re}"
  else
    echo -e "${red} Download failed! ${re}"
    exit 1
  fi
  rm -rf /tmp/sub-check_tmp_install.tar.gz
  rm -rf $INSTALL_PATH/README.md
  rm -rf $INSTALL_PATH/LICENSE
#安装结束



cat <<-EOF > /$INSTALL_PATH/subs.service
[Unit]
Description=Subs-Check Service
After=network.target syslog.target
Wants=network.target

[Service]
Type=simple
ExecStart=$INSTALL_PATH/subs

[Install]
WantedBy=multi-user.target
EOF


echo "正在写出配置文件"
sudo -u root mv $INSTALL_PATH/subs.service /etc/systemd/system/subs.service
echo "写出配置文件完成 正在配置开机启动"
sudo -u root systemctl enable subs.service
echo "开机启动已完成 正在重载服务"
sudo -u root systemctl daemon-reload
echo "重启配置完成 准备重启服务"
sudo -u root systemctl restart subs.service
echo "重启服务完成"
curl -s -4 ping0.cc/geo
echo "显示当前网络"
rm $0
# fi

